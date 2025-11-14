from pydantic import BaseModel


class BoardRequest(BaseModel):
    board: list[str]


class SimpleResponse(BaseModel):
    status: str
