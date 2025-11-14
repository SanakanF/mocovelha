from typing import Literal

from pydantic import BaseModel, Field, validator


class BoardRequest(BaseModel):
    board: list[str] = Field(..., min_items=9, max_items=9)
    player: Literal["X", "O"]

    @validator("board")
    def validate_board(cls, value: list[str]) -> list[str]:
        valid_symbols = {"X", "O", ""}
        if any(cell not in valid_symbols for cell in value):
            raise ValueError("Cada posição do tabuleiro deve ser X, O ou vazio.")
        return value


class AIMoveResponse(BaseModel):
    move: int


class TrainLevelRequest(BaseModel):
    target_episodes: int = Field(..., ge=0)


class StateResponse(BaseModel):
    total_episodes: int
    known_states: int


class SimpleResponse(BaseModel):
    status: str
