"""Core Tic-Tac-Toe game logic for the MocoVelha project."""

from __future__ import annotations

from typing import List

PLAYER_X = "X"
PLAYER_O = "O"
EMPTY = ""

WINNING_COMBINATIONS: tuple[tuple[int, int, int], ...] = (
    (0, 1, 2),
    (3, 4, 5),
    (6, 7, 8),
    (0, 3, 6),
    (1, 4, 7),
    (2, 5, 8),
    (0, 4, 8),
    (2, 4, 6),
)


def create_board() -> List[str]:
    """Return a fresh empty Tic-Tac-Toe board."""

    return [EMPTY for _ in range(9)]


def available_moves(board: List[str]) -> List[int]:
    """Return the indices that are still empty on the board."""

    return [index for index, value in enumerate(board) if value == EMPTY]


def apply_move(board: List[str], position: int, player: str) -> List[str]:
    """Return a new board with the given move applied."""

    if position not in range(9):
        raise ValueError("Posição inválida para o tabuleiro do jogo da velha.")

    if board[position] != EMPTY:
        raise ValueError("A posição selecionada já está ocupada.")

    new_board = board.copy()
    new_board[position] = player
    return new_board


def is_board_full(board: List[str]) -> bool:
    """Return True if the board has no empty spaces."""

    return all(cell != EMPTY for cell in board)


def check_winner(board: List[str]) -> str | None:
    """Evaluate the board and return the game outcome if it is decided."""

    for combo in WINNING_COMBINATIONS:
        a, b, c = combo
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]

    if is_board_full(board):
        return "draw"

    return None
