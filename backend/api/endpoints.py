import threading

from fastapi import APIRouter, HTTPException

from ..ai.game import available_moves, check_winner
from ..ai.qlearning import QLearningAgent
from .schemas import (
    AIMoveResponse,
    BoardRequest,
    SimpleResponse,
    StateResponse,
    TrainLevelRequest,
)

router = APIRouter(tags=["mocovelha"])

agent = QLearningAgent()
_agent_lock = threading.Lock()


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


@router.post("/train-level", response_model=StateResponse)
def train_level(request: TrainLevelRequest) -> StateResponse:
    """Ajusta o nível de treinamento da IA até o número desejado de episódios."""

    target = request.target_episodes

    with _agent_lock:
        if agent.total_episodes < target:
            episodes_to_run = target - agent.total_episodes
            agent.train(episodes_to_run)

        return StateResponse(total_episodes=agent.total_episodes, known_states=len(agent.Q))


@router.get("/state", response_model=StateResponse)
def get_state() -> StateResponse:
    """Retorna estatísticas básicas do agente de IA."""

    with _agent_lock:
        return StateResponse(total_episodes=agent.total_episodes, known_states=len(agent.Q))
