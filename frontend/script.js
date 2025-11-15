console.log("Rodando MocoVelha frontend");
const winningCombinations = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const board = Array(9).fill("");
const cells = Array.from(document.querySelectorAll(".cell"));
const modeButtons = Array.from(document.querySelectorAll(".mode-button"));
const levelButtons = Array.from(document.querySelectorAll(".level-button"));
const statusMessage = document.getElementById("status-message");
const resetButton = document.getElementById("reset-button");
const aiControls = document.querySelector(".ai-controls");
const iaLevelElement = document.getElementById("ia-level");
const iaEpisodesElement = document.getElementById("ia-episodes");
const iaStatesElement = document.getElementById("ia-states");
const iaLoadedElement = document.getElementById("ia-loaded");
const trainButton = document.getElementById("train-ia-btn");

let currentPlayer = "X";
let gameOver = false;
let aiThinking = false;
let currentMode = "pvp";
let currentLevel = "level_0";
let iaStatus = {
  total_episodes: 0,
  known_states: 0,
  episodes_target: 0,
  model_loaded: false,
};

function render() {
  cells.forEach((cell, index) => {
    const value = board[index];
    cell.textContent = value;
    cell.classList.remove("cell-x", "cell-o");
    cell.disabled = gameOver || aiThinking || value !== "";

    if (value === "X") {
      cell.classList.add("cell-x");
    } else if (value === "O") {
      cell.classList.add("cell-o");
    }
  });
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function resetGame() {
  for (let i = 0; i < board.length; i += 1) {
    board[i] = "";
  }
  currentPlayer = "X";
  gameOver = false;
  aiThinking = false;
  render();
  if (currentMode === "ai") {
    setStatus("Sua vez! Você joga com X.");
  } else {
    setStatus("Jogador X começa!");
  }
}

function setMode(mode) {
  if (currentMode === mode) {
    return;
  }
  currentMode = mode;
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  aiControls.classList.toggle("inactive", mode !== "ai");
  resetGame();
  if (mode === "ai") {
    fetchState();
  }
}

function checkWinnerLocal(currentBoard) {
  for (const combo of winningCombinations) {
    const [a, b, c] = combo;
    if (
      currentBoard[a] &&
      currentBoard[a] === currentBoard[b] &&
      currentBoard[a] === currentBoard[c]
    ) {
      return currentBoard[a];
    }
  }

  if (currentBoard.every((cell) => cell !== "")) {
    return "draw";
  }

  return null;
}

function updateIAStatusPanel() {
  if (!iaLevelElement || !iaEpisodesElement || !iaStatesElement || !iaLoadedElement) {
    return;
  }

  iaLevelElement.textContent = currentLevel;
  iaEpisodesElement.textContent = iaStatus.total_episodes;
  iaStatesElement.textContent = iaStatus.known_states;
  iaLoadedElement.textContent = iaStatus.model_loaded ? "Sim" : "Não";
}

async function fetchState() {
  try {
    const response = await fetch("state");
    if (!response.ok) {
      throw new Error(`Falha ao obter estado da IA: ${response.status}`);
    }

    const data = await response.json();
    currentLevel = data.level;
    iaStatus = {
      total_episodes: data.total_episodes,
      known_states: data.known_states,
      episodes_target: data.episodes_target ?? 0,
      model_loaded: data.model_loaded,
    };
    levelButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.level === currentLevel);
    });
    updateIAStatusPanel();
    return data;
  } catch (error) {
    console.error("Erro ao buscar estado da IA:", error);
    return null;
  }
}

async function selectLevel(level) {
  currentLevel = level;
  levelButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.level === level);
  });

  setStatus("Carregando nível da IA, aguarde...");
  try {
    const response = await fetch("set-level", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ level: currentLevel }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao definir nível: ${response.status}`);
    }

    const data = await fetchState();
    if (data && currentMode === "ai") {
      setStatus(
        `Nível ${currentLevel} selecionado. Episódios treinados: ${data.total_episodes}. Selecione uma casa para jogar.`,
      );
    } else if (data) {
      setStatus(
        `Nível ${currentLevel} pronto com ${data.total_episodes} episódios. Ative o modo Humano vs IA para jogar.`,
      );
    }
  } catch (error) {
    console.error("Erro ao definir nível da IA:", error);
    setStatus("Não foi possível atualizar o nível da IA. Verifique a conexão com o servidor.");
  }
}

async function trainCurrentLevel() {
  const targetEpisodes =
    iaStatus.episodes_target && iaStatus.episodes_target > iaStatus.total_episodes
      ? iaStatus.episodes_target
      : iaStatus.total_episodes + 1000;

  setStatus("Treinando IA, aguarde...");

  try {
    const response = await fetch("train-level", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target_episodes: targetEpisodes }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao treinar IA: ${response.status}`);
    }

    const data = await fetchState();
    if (data) {
      const message =
        currentMode === "ai"
          ? `IA pronta! Total de episódios treinados: ${data.total_episodes}. Selecione uma casa para jogar.`
          : `IA treinada com ${data.total_episodes} episódios. Ative o modo Humano vs IA para jogar.`;
      setStatus(message);
    }
  } catch (error) {
    console.error("Erro ao treinar a IA:", error);
    setStatus("Não foi possível treinar a IA. Verifique a conexão com o servidor.");
  }
}

function handleGameOver(result) {
  gameOver = true;
  aiThinking = false;
  render();

  if (result === "draw") {
    setStatus("Empate! Que partida equilibrada.");
  } else if (result === "X") {
    setStatus(currentMode === "ai" ? "Você venceu!" : "Jogador X venceu!");
  } else if (result === "O") {
    setStatus(currentMode === "ai" ? "A IA venceu!" : "Jogador O venceu!");
  }
}

async function handleAIMove() {
  aiThinking = true;
  render();
  setStatus("IA pensando...");

  try {
    const response = await fetch("ai-move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ board, player: "O" }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao obter jogada da IA: ${response.status}`);
    }

    const data = await response.json();
    const aiMove = data.move;

    if (board[aiMove] === "") {
      board[aiMove] = "O";
    }

    const outcome = checkWinnerLocal(board);
    if (outcome) {
      handleGameOver(outcome);
      return;
    }

    aiThinking = false;
    render();
    setStatus("Sua vez! Você joga com X.");
  } catch (error) {
    console.error("Erro ao obter jogada da IA:", error);
    aiThinking = false;
    setStatus("Ocorreu um erro ao comunicar com a IA.");
  }
}

function handleCellClick(event) {
  const index = Number(event.currentTarget.dataset.index);

  if (gameOver || aiThinking || board[index] !== "") {
    return;
  }

  if (currentMode === "pvp") {
    board[index] = currentPlayer;
    render();
    const result = checkWinnerLocal(board);
    if (result) {
      handleGameOver(result);
      return;
    }
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    setStatus(`Vez do jogador ${currentPlayer}`);
    return;
  }

  // Modo humano vs IA
  board[index] = "X";
  render();
  const result = checkWinnerLocal(board);
  if (result) {
    handleGameOver(result);
    return;
  }

  await handleAIMove();
}

cells.forEach((cell) => {
  cell.addEventListener("click", handleCellClick);
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

levelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const { level } = button.dataset;
    if (level) {
      selectLevel(level);
    }
  });
});

resetButton.addEventListener("click", resetGame);
if (trainButton) {
  trainButton.addEventListener("click", () => {
    trainCurrentLevel();
  });
}

// Inicialização
render();
setStatus("Jogador X começa!");
fetchState();
