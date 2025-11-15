import threading
from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..ai.game import available_moves, check_winner
from ..ai.qlearning import QLearningAgent
from .schemas import (
    AIMoveResponse,
    BoardRequest,
    SetLevelRequest,
    SimpleResponse,
    StateResponse,
    TrainLevelRequest,
)

router = APIRouter(tags=["mocovelha"])

agent = QLearningAgent()
_agent_lock = threading.Lock()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

LEVELS = {
    "level_0": 0,
    "level_1k": 1_000,
    "level_10k": 10_000,
    "level_50k": 50_000,
}

current_level: str = "level_0"


def _get_model_path_for_level(level: str) -> Path:
    return DATA_DIR / f"qtable_{level}.json"


def _set_level(level: str) -> None:
    """Atualiza o nível atual e tenta carregar o modelo persistido."""

    global current_level
    current_level = level
    agent.set_model_path(_get_model_path_for_level(level))
    agent.load()


def _model_loaded() -> bool:
    return bool(agent.model_path and agent.model_path.exists())


def _state_response() -> StateResponse:
    return StateResponse(
        total_episodes=agent.total_episodes,
        known_states=len(agent.Q),
        level=current_level,
        model_loaded=_model_loaded(),
        episodes_target=LEVELS.get(current_level),
    )


@router.get("/status", response_model=SimpleResponse)
def get_status() -> SimpleResponse:
    """Retorna o status básico da API."""

    return SimpleResponse(status="ok")


@router.post("/ai-move", response_model=AIMoveResponse)
def ai_move(request: BoardRequest) -> AIMoveResponse:
    """Retorna a jogada da IA para o tabuleiro informado."""

    winner = check_winner(request.board)
    if winner is not None:
        raise HTTPException(status_code=400, detail="A partida já foi finalizada.")

    valid_moves = available_moves(request.board)
    if not valid_moves:
        raise HTTPException(status_code=400, detail="Não há jogadas válidas disponíveis.")

    if request.player != "O":
        raise HTTPException(status_code=400, detail="A IA deve jogar com o marcador 'O'.")

    with _agent_lock:
        move = agent.best_move(request.board)

    return AIMoveResponse(move=move)


@router.post("/set-level", response_model=StateResponse)
def set_level(request: SetLevelRequest) -> StateResponse:
    """Define explicitamente o nível de treinamento a ser utilizado."""

    level = request.level
    if level not in LEVELS:
        raise HTTPException(status_code=400, detail="Nível de IA inválido.")

    with _agent_lock:
        _set_level(level)
        return _state_response()


@router.post("/train-level", response_model=StateResponse)
def train_level(request: TrainLevelRequest) -> StateResponse:
    """Ajusta o nível de treinamento da IA até o número desejado de episódios."""

    target = request.target_episodes or LEVELS.get(current_level, 0)

    with _agent_lock:
        if target > agent.total_episodes:
            episodes_to_run = target - agent.total_episodes
            agent.train(episodes_to_run)
            agent.save()
        return _state_response()


@router.get("/state", response_model=StateResponse)
def get_state() -> StateResponse:
    """Retorna estatísticas básicas do agente de IA."""

    with _agent_lock:
        return _state_response()


_set_level("level_0")
