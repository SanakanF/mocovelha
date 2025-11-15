"""Estrutura inicial para o modo online do Moco Moco - Jogo da Velha.

Este módulo atua como um esqueleto para futuras funcionalidades de jogo
em tempo real, incluindo criação de salas, gerenciamento de jogadores e
sincronização de jogadas via WebSocket. Nada aqui é exposto no app
principal por enquanto: os métodos e classes servem apenas como base
para o próximo plano de trabalho.

TODO: criar endpoint WebSocket para /ws/mocovelha no próximo plano.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class OnlineMatch:
    """Representa uma partida online entre dois participantes.

    Os atributos são placeholders e devem ser expandidos no modo online
    real para incluir tabuleiro, turno atual, etc.
    """

    room_code: str
    players: List[str] = field(default_factory=list)
    board_state: Optional[List[str]] = None
    current_turn: Optional[str] = None


class RoomManager:
    """Responsável por orquestrar salas e partidas online.

    Os métodos abaixo serão implementados no plano dedicado ao modo
    online. No momento, eles funcionam apenas como placeholders.
    """

    def __init__(self) -> None:
        self.rooms: Dict[str, OnlineMatch] = {}

    def create_room(self, room_code: str) -> OnlineMatch:
        """Cria uma nova sala de partida.

        TODO: implementar a lógica de criação, validação de código e
        retorno de estado inicial.
        """

        raise NotImplementedError("create_room ainda será implementado")

    def join_room(self, room_code: str, player_id: str) -> OnlineMatch:
        """Adiciona um jogador a uma sala existente.

        TODO: validar limites de jogadores, estado da partida e retorno
        de informações sincronizadas.
        """

        raise NotImplementedError("join_room ainda será implementado")

    def leave_room(self, room_code: str, player_id: str) -> None:
        """Remove um jogador da sala.

        TODO: lidar com encerramento de partidas, notificação aos
        participantes e limpeza de recursos.
        """

        raise NotImplementedError("leave_room ainda será implementado")

    def send_move(self, room_code: str, player_id: str, move_index: int) -> None:
        """Envia uma jogada para a sala correspondente.

        TODO: validar turno, atualizar estado do tabuleiro e emitir
        mensagens em tempo real.
        """

        raise NotImplementedError("send_move ainda será implementado")


# TODO: no próximo plano, conectar RoomManager a rotas WebSocket e a um
# sistema de filas/assinaturas que mantenha os jogadores sincronizados.
