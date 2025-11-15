console.log("Rodando MocoVelha frontend");

const AudioContextClass = window.AudioContext || window.webkitAudioContext;

const soundManager = (() => {
  let context;
  let thinkingOscillator = null;
  let thinkingGain = null;
  let thinkingInterval = null;

  function ensureContext() {
    if (!AudioContextClass) {
      return null;
    }
    if (!context) {
      context = new AudioContextClass();
    }
    if (context.state === "suspended") {
      context.resume().catch(() => {
        /* noop */
      });
    }
    return context;
  }

  function playTone({ frequency, type = "sine", duration = 0.18, volume = 0.18, attack = 0.02, release = 0.12, startOffset = 0 }) {
    const ctx = ensureContext();
    if (!ctx) {
      return;
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    const startTime = ctx.currentTime + startOffset;
    const endTime = startTime + duration + release;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(endTime + 0.05);
  }

  function playClick() {
    playTone({ frequency: 520, type: "triangle", duration: 0.1, volume: 0.14 });
    playTone({ frequency: 780, type: "sine", duration: 0.08, volume: 0.12, startOffset: 0.02 });
  }

  function playWinX() {
    playTone({ frequency: 660, type: "sine", duration: 0.25, volume: 0.18 });
    playTone({ frequency: 880, type: "triangle", duration: 0.25, volume: 0.14, startOffset: 0.05 });
    playTone({ frequency: 1040, type: "square", duration: 0.2, volume: 0.12, startOffset: 0.1 });
  }

  function playWinO() {
    playTone({ frequency: 320, type: "sine", duration: 0.3, volume: 0.16 });
    playTone({ frequency: 220, type: "square", duration: 0.28, volume: 0.12, startOffset: 0.05 });
    playTone({ frequency: 480, type: "triangle", duration: 0.22, volume: 0.1, startOffset: 0.08 });
  }

  function playDraw() {
    playTone({ frequency: 480, type: "sine", duration: 0.2, volume: 0.12 });
    playTone({ frequency: 540, type: "triangle", duration: 0.2, volume: 0.1, startOffset: 0.04 });
  }

  function playThinking() {
    const ctx = ensureContext();
    if (!ctx || thinkingOscillator) {
      return;
    }

    thinkingOscillator = ctx.createOscillator();
    thinkingGain = ctx.createGain();
    thinkingOscillator.type = "sine";
    thinkingOscillator.frequency.setValueAtTime(260, ctx.currentTime);
    thinkingGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    thinkingGain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 0.2);

    thinkingOscillator.connect(thinkingGain);
    thinkingGain.connect(ctx.destination);

    thinkingOscillator.start();

    thinkingInterval = window.setInterval(() => {
      if (!thinkingOscillator || !context) {
        return;
      }
      const now = context.currentTime;
      const baseFrequency = 240 + Math.random() * 40;
      thinkingOscillator.frequency.linearRampToValueAtTime(baseFrequency, now + 0.12);
      thinkingGain.gain.setTargetAtTime(0.03 + Math.random() * 0.01, now, 0.15);
    }, 400);
  }

  function stopThinking() {
    if (!thinkingOscillator || !thinkingGain) {
      return;
    }
    const ctx = context;
    if (ctx) {
      const now = ctx.currentTime;
      thinkingGain.gain.cancelAndHoldAtTime(now);
      thinkingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      thinkingOscillator.stop(now + 0.3);
    } else {
      thinkingOscillator.stop();
    }

    thinkingOscillator = null;
    thinkingGain = null;
    if (thinkingInterval) {
      window.clearInterval(thinkingInterval);
      thinkingInterval = null;
    }
  }

  return {
    playClick,
    playWinX,
    playWinO,
    playDraw,
    playThinking,
    stopThinking,
  };
})();
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
const devPanel = document.getElementById("dev-panel");
const devPanelClose = document.getElementById("dev-panel-close");
const devStatsElements = {
  level: document.getElementById("dev-level"),
  episodes: document.getElementById("dev-episodes"),
  states: document.getElementById("dev-states"),
  target: document.getElementById("dev-target"),
  loaded: document.getElementById("dev-loaded"),
};
const devQTableMessage = document.getElementById("dev-qtable-message");

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
    cell.dataset.symbol = value;
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
  soundManager.stopThinking();
  render();
  if (currentMode === "ai") {
    setStatus("Capivara na dianteira! Faça a primeira jogada.");
  } else {
    setStatus("Capivara começa a aventura! 🐹✨");
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
    setStatus("Modo Capivara vs Berinjela ativado! Escolha uma casa.");
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
  updateDevPanel();
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
        `Capivara preparada no nível ${currentLevel}! Episódios treinados: ${data.total_episodes}. Escolha sua casa.`,
      );
    } else if (data) {
      setStatus(
        `Nível ${currentLevel} com ${data.total_episodes} episódios pronto. Ative o modo Capivara vs IA para brincar.`,
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
          ? `IA pronta! Total de episódios treinados: ${data.total_episodes}. Capivara aguarda sua jogada.`
          : `IA treinada com ${data.total_episodes} episódios. Ative o modo Capivara vs IA para jogar.`;
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
  soundManager.stopThinking();
  render();

  if (result === "draw") {
    setStatus("Empate! Batalha equilibrada.");
    soundManager.playDraw();
  } else if (result === "X") {
    setStatus("Capivara venceu! 🐹✨");
    soundManager.playWinX();
  } else if (result === "O") {
    setStatus("Berinjela aprontou dessa vez! 🍆😈");
    soundManager.playWinO();
  }
}

async function handleAIMove() {
  aiThinking = true;
  render();
  setStatus("Berinjela está tramando... 🍆🤔");
  soundManager.playThinking();

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
      soundManager.playClick();
    }

    const outcome = checkWinnerLocal(board);
    if (outcome) {
      handleGameOver(outcome);
      soundManager.stopThinking();
      return;
    }

    aiThinking = false;
    soundManager.stopThinking();
    render();
    setStatus("Capivara heroína, é sua vez! ✨");
  } catch (error) {
    console.error("Erro ao obter jogada da IA:", error);
    aiThinking = false;
    soundManager.stopThinking();
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
    soundManager.playClick();
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
  soundManager.playClick();
  render();
  const result = checkWinnerLocal(board);
  if (result) {
    handleGameOver(result);
    return;
  }

  await handleAIMove();
}

function updateDevPanel() {
  if (!devPanel) {
    return;
  }
  if (devStatsElements.level) {
    devStatsElements.level.textContent = currentLevel;
  }
  if (devStatsElements.episodes) {
    devStatsElements.episodes.textContent = iaStatus.total_episodes;
  }
  if (devStatsElements.states) {
    devStatsElements.states.textContent = iaStatus.known_states;
  }
  if (devStatsElements.target) {
    devStatsElements.target.textContent = iaStatus.episodes_target ?? "—";
  }
  if (devStatsElements.loaded) {
    devStatsElements.loaded.textContent = iaStatus.model_loaded ? "Sim" : "Não";
  }
  if (devQTableMessage) {
    devQTableMessage.textContent =
      "TODO: conectar uma amostra da Q-Table quando o backend expuser estes dados.";
  }
}

function setDevPanelVisibility(visible) {
  if (!devPanel) {
    return;
  }
  if (visible) {
    devPanel.classList.add("is-visible");
    devPanel.setAttribute("aria-hidden", "false");
    updateDevPanel();
  } else {
    devPanel.classList.remove("is-visible");
    devPanel.setAttribute("aria-hidden", "true");
  }
}

function toggleDevPanel(forceValue) {
  if (!devPanel) {
    return;
  }
  const isVisible = devPanel.classList.contains("is-visible");
  const nextValue = typeof forceValue === "boolean" ? forceValue : !isVisible;
  setDevPanelVisibility(nextValue);
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

if (devPanel) {
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "m" && event.ctrlKey && event.shiftKey) {
      event.preventDefault();
      toggleDevPanel();
    }
    if (event.key === "Escape" && devPanel.classList.contains("is-visible")) {
      event.preventDefault();
      toggleDevPanel(false);
    }
  });

  devPanel.addEventListener("click", (event) => {
    if (event.target === devPanel) {
      toggleDevPanel(false);
    }
  });

  if (devPanelClose) {
    devPanelClose.addEventListener("click", () => {
      toggleDevPanel(false);
    });
  }
}

// Inicialização
render();
setStatus("Capivara começa a aventura! 🐹✨");
fetchState();
