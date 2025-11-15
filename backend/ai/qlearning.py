"""Agente de Q-Learning para o jogo da velha."""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Dict, List, Optional

from .game import (
    PLAYER_O,
    PLAYER_X,
    available_moves,
    apply_move,
    check_winner,
    create_board,
)


class QLearningAgent:
    """Agente responsável por aprender políticas para o jogo da velha."""

    def __init__(self, alpha: float = 0.5, gamma: float = 0.9, epsilon: float = 0.1):
        """Inicializa o agente de Q-Learning."""

        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.Q: Dict[str, Dict[int, float]] = {}
        self.total_episodes: int = 0
        self.model_path: Path | None = None

    def set_model_path(self, path: Path) -> None:
        """Define o caminho utilizado para salvar/carregar a Q-table."""

        self.model_path = path

    def get_state(self, board: List[str]) -> str:
        """Converte o tabuleiro em uma string estável."""

        return "".join(cell if cell else "_" for cell in board)

    def _ensure_state(self, state: str, valid_actions: List[int]) -> None:
        """Garante que o estado esteja presente na Q-table."""

        if state not in self.Q:
            self.Q[state] = {action: 0.0 for action in valid_actions}
        else:
            for action in valid_actions:
                self.Q[state].setdefault(action, 0.0)

    def choose_action(self, board: List[str], valid_actions: List[int], explore: bool = True) -> int:
        """Escolhe uma ação baseada na estratégia epsilon-greedy."""

        state = self.get_state(board)
        self._ensure_state(state, valid_actions)

        if explore and random.random() < self.epsilon:
            return random.choice(valid_actions)

        q_values = self.Q[state]
        max_value = max(q_values[action] for action in valid_actions)
        best_actions = [action for action in valid_actions if q_values[action] == max_value]
        return random.choice(best_actions)

    def update(
        self,
        state: str,
        action: int,
        reward: float,
        next_state: Optional[str],
        next_valid_actions: Optional[List[int]],
    ) -> None:
        """Atualiza os valores da Q-table de acordo com a regra do Q-Learning."""

        self._ensure_state(state, [action])
        current_value = self.Q[state][action]

        future_value = 0.0
        if next_state is not None and next_valid_actions:
            self._ensure_state(next_state, next_valid_actions)
            future_value = max(self.Q[next_state][next_action] for next_action in next_valid_actions)

        updated_value = current_value + self.alpha * (reward + self.gamma * future_value - current_value)
        self.Q[state][action] = updated_value

    def play_self_game(self) -> float:
        """Executa uma partida de autojogo para atualização da Q-table."""

        board = create_board()
        current_player = PLAYER_X
        history: List[Dict[str, object]] = []

        while True:
            valid_actions = available_moves(board)
            if not valid_actions:
                break

            action = self.choose_action(board, valid_actions, explore=True)
            new_board = apply_move(board, action, current_player)

            entry = {
                "state": self.get_state(board),
                "action": action,
                "player": current_player,
                "next_state": self.get_state(new_board),
                "next_valid": available_moves(new_board),
            }

            winner = check_winner(new_board)
            if winner is not None:
                entry["next_state"] = None
                entry["next_valid"] = None
                history.append(entry)

                rewards = {
                    PLAYER_X: 0.0,
                    PLAYER_O: 0.0,
                }
                if winner == PLAYER_X:
                    rewards[PLAYER_X] = 1.0
                    rewards[PLAYER_O] = -1.0
                elif winner == PLAYER_O:
                    rewards[PLAYER_X] = -1.0
                    rewards[PLAYER_O] = 1.0

                for record in history:
                    reward = rewards[record["player"]] if record["next_state"] is None else 0.0
                    self.update(
                        state=record["state"],
                        action=record["action"],
                        reward=reward,
                        next_state=record["next_state"],
                        next_valid_actions=record["next_valid"],
                    )

                return rewards[PLAYER_X]

            history.append(entry)
            board = new_board
            current_player = PLAYER_O if current_player == PLAYER_X else PLAYER_X

        # Empate por falta de jogadas restantes
        for record in history:
            reward = 0.0
            self.update(
                state=record["state"],
                action=record["action"],
                reward=reward,
                next_state=record["next_state"],
                next_valid_actions=record["next_valid"],
            )

        return 0.0

    def train(self, episodes: int = 1000) -> None:
        """Executa o treinamento por meio de várias partidas de autojogo."""

        for _ in range(episodes):
            self.play_self_game()
        self.total_episodes += episodes

    def save(self) -> None:
        """Salva a Q-table e metadados no caminho configurado."""

        if self.model_path is None:
            return

        data = {
            "total_episodes": self.total_episodes,
            "Q": {
                state: {str(action): value for action, value in actions.items()}
                for state, actions in self.Q.items()
            },
        }

        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        self.model_path.write_text(json.dumps(data))

    def load(self) -> None:
        """Carrega a Q-table previamente persistida, se disponível."""

        self.Q = {}
        self.total_episodes = 0

        if self.model_path is None:
            return

        if not self.model_path.exists():
            return

        try:
            data = json.loads(self.model_path.read_text())
        except json.JSONDecodeError:
            return

        self.total_episodes = int(data.get("total_episodes", 0))
        q_table: Dict[str, Dict[str, float]] = data.get("Q", {})
        for state, actions in q_table.items():
            self.Q[state] = {}
            for action_str, value in actions.items():
                try:
                    action_int = int(action_str)
                except ValueError:
                    continue
                self.Q[state][action_int] = float(value)

    def best_move(self, board: List[str]) -> int:
        """Retorna a melhor jogada conhecida para o tabuleiro fornecido."""

        valid_actions = available_moves(board)
        if not valid_actions:
            raise ValueError("Não há jogadas válidas disponíveis.")

        state = self.get_state(board)
        if state not in self.Q:
            return random.choice(valid_actions)

        q_values = self.Q[state]
        known_actions = [action for action in valid_actions if action in q_values]
        if not known_actions:
            return random.choice(valid_actions)

        max_value = max(q_values[action] for action in known_actions)
        best_actions = [action for action in known_actions if q_values[action] == max_value]
        return random.choice(best_actions)
