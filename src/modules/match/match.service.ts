import { ApplicationStatus, Prisma, User } from "@prisma/client";
import prisma from "../../prisma/client";
import {
  MatchDto,
  MatchFilters,
  MATCH_STATUS,
  AddPlayerToMatchRequest,
  UpdateMatchDto,
  DeletePlayerFromMatchRequest
} from "../../types/matchTypes";
import { createTeam, getDBFilter, updateTeams } from "../../utils/match";
import { getUserSelect } from "../../utils/auth";
import { CustomError } from "../../types/customError";
import { ErrorCode } from "../../constants/errorCode";
import { getPlayerById } from "../../utils/player";

export const createMatch = async (playerId: number, data: MatchDto) => {
  const { date, time, location, description, categoryId, pointsDeviation, teams, genderId, duration } = data;

  // Validar que cada jugador aparezca solo una vez en los equipos
  if (teams) {
    const allPlayers = [...(teams.team1 || []), ...(teams.team2 || [])];
    const playerIds = allPlayers.map((player) => player.id).filter(Boolean);
    const uniquePlayerIds = [...new Set(playerIds)];

    if (playerIds.length !== uniquePlayerIds.length) {
      throw new CustomError("No se puede agregar el mismo jugador 2 veces", ErrorCode.PLAYER_ALREADY_IN_MATCH);
    }
  }

  const matchStatus: MATCH_STATUS =
    (teams?.team1?.length || 0) + (teams?.team2?.length || 0) === 4 ? MATCH_STATUS.CLOSED : MATCH_STATUS.PENDING;

  const team1 = await createTeam(1, teams?.team1, genderId);
  const team2 = await createTeam(2, teams?.team2, genderId);

  const match = await prisma.match.create({
    data: {
      dateTime: `${date}T${time}:00.000Z`,
      location,
      description,
      pointsDeviation,
      category: {
        connect: {
          id: categoryId
        }
      },
      gender: {
        connect: {
          id: genderId
        }
      },
      creator: { connect: { id: playerId } },
      status: { connect: { name: matchStatus } },
      players: { connect: [...team1.players.connect, ...team2.players.connect] },
      teams: {
        create: [team1, team2]
      },
      duration
    }
  });
  // TODO - notificar jugadores (en el caso que haya)

  return match;
};

export const getOpenMatches = async (filters: MatchFilters) => {
  const { page, pageSize } = filters;
  const where = {
    AND: [
      {
        status: {
          name: MATCH_STATUS.PENDING
        }
      },
      getDBFilter(filters)
    ]
  };

  return await prisma.$transaction([
    prisma.match.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
      include: {
        status: true,
        teams: {
          include: {
            players: true
          }
        }
      }
    }),
    prisma.match.count({
      where
    })
  ]);
};

export const getMyMatches = async (playerId: number, filters: MatchFilters) => {
  const { page, pageSize, createdBy, isPlayer } = filters;

  const or = [];
  const include: Prisma.MatchInclude = {
    status: true,
    gender: true,
    category: true,
    teams: {
      include: {
        players: {
          include: {
            gender: true,
            category: true,
            position: true,
            user: getUserSelect()
          }
        }
      }
    }
  };
  if (createdBy) {
    or.push({ creatorPlayerId: playerId });
    include.applications = {
      where: {
        status: ApplicationStatus.PENDING
      },
      include: {
        player: {
          include: {
            gender: true,
            category: true,
            position: true
          }
        }
      }
    };
  }
  if (isPlayer)
    or.push({
      players: {
        some: {
          id: playerId
        }
      }
    });

  const where = {
    AND: [
      {
        OR: or
      },
      getDBFilter(filters),
      {
        status: {
          name: MATCH_STATUS.PENDING
        }
      }
    ]
  };

  return await prisma.$transaction([
    prisma.match.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
      include,
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.match.count({
      where
    })
  ]);
};

export const getMatchById = async (matchId: number) => {
  return await prisma.match.findUnique({
    where: {
      id: matchId
    },
    include: {
      teams: {
        include: {
          players: true
        }
      },
      sets: true,
      status: true,
      applications: {
        where: {
          status: ApplicationStatus.PENDING
        }
      }
    }
  });
};

export const deleteMatch = async (matchId: number) => {
  return await prisma.match.update({
    where: {
      id: matchId
    },
    data: {
      status: {
        connect: {
          name: MATCH_STATUS.CANCELLED
        }
      }
    }
  });
};

export const addPlayerToMatch = async (data: AddPlayerToMatchRequest) => {
  // Obtener el partido actual para validaciones
  const currentMatch = await getMatchById(data.matchId);
  if (!currentMatch) {
    throw new CustomError("No existing match with id: " + data.matchId, ErrorCode.NO_MATCH);
  }

  // Verificar que el jugador no esté ya en el partido
  const playerInMatch = currentMatch.teams.some((team) => team.players.some((player) => player.id === data.playerId));

  if (playerInMatch) {
    throw new CustomError("El jugador ya está en el partido", ErrorCode.PLAYER_ALREADY_IN_MATCH);
  }

  // Verificar que el equipo no esté lleno
  const targetTeam = currentMatch.teams.find((team) => team.teamNumber === data.teamNumber);
  if (targetTeam && targetTeam.players.length >= 2) {
    throw new CustomError("El equipo está lleno", ErrorCode.APPLICATION_TEAM_FULL);
  }

  // TODO - validar genero de jugador contra el genero de partido
  return await prisma.match.update({
    where: {
      id: data.matchId
    },
    data: {
      players: {
        connect: { id: data.playerId }
      },
      teams: {
        update: {
          where: {
            matchId_teamNumber: {
              matchId: data.matchId,
              teamNumber: data.teamNumber
            }
          },
          data: {
            players: {
              connect: { id: data.playerId }
            }
          }
        }
      }
    },
    include: { players: true }
  });
};

export const changeState = async (matchId: number, status: MATCH_STATUS) => {
  return await prisma.match.update({
    where: {
      id: matchId
    },
    data: {
      status: {
        connect: {
          name: status
        }
      }
    }
  });
};

export const updateMatch = async (matchId: number, data: UpdateMatchDto) => {
  const updateData: any = {};

  if (data.location !== undefined) updateData.location = data.location;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.duration !== undefined) updateData.duration = data.duration;
  if (data.pointsDeviation !== undefined) updateData.pointsDeviation = data.pointsDeviation;

  if (data.date && data.time) {
    updateData.dateTime = `${data.date}T${data.time}:00.000Z`;
  }

  if (data.genderId !== undefined) {
    updateData.gender = { connect: { id: data.genderId } };
  }

  if (data.categoryId !== undefined) {
    updateData.category = { connect: { id: data.categoryId } };
  }

  // Si se van a actualizar los equipos, necesitamos el genderId para validaciones
  let genderId = data.genderId;
  if (data.teams && !genderId) {
    const currentMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: { gender: true }
    });
    genderId = currentMatch?.genderId;
  }

  // Actualizar el partido
  const updatedMatch = await prisma.match.update({
    where: {
      id: matchId
    },
    data: updateData,
    include: {
      teams: {
        include: {
          players: true
        }
      },
      sets: true,
      status: true,
      applications: {
        where: {
          status: ApplicationStatus.PENDING
        }
      }
    }
  });

  // Si se incluyen equipos, actualizarlos
  if (data.teams && genderId) {
    // Validar que cada jugador aparezca solo una vez en los equipos
    const allPlayers = [...(data.teams.team1 || []), ...(data.teams.team2 || [])];
    const playerIds = allPlayers.map((player) => player.id).filter(Boolean);
    const uniquePlayerIds = [...new Set(playerIds)];

    if (playerIds.length !== uniquePlayerIds.length) {
      throw new CustomError("No se puede agregar el mismo jugador 2 veces", ErrorCode.PLAYER_ALREADY_IN_MATCH);
    }

    await updateTeams(matchId, data.teams, genderId);

    // Obtener el partido actualizado con los nuevos equipos
    return await prisma.match.findUnique({
      where: {
        id: matchId
      },
      include: {
        teams: {
          include: {
            players: true
          }
        },
        sets: true,
        status: true,
        applications: {
          where: {
            status: ApplicationStatus.PENDING
          }
        }
      }
    });
  }

  return updatedMatch;
};

export const deletePlayerFromMatch = async (data: DeletePlayerFromMatchRequest) => {
  // Obtener el partido actual para validaciones
  const currentMatch = await getMatchById(data.matchId);
  if (!currentMatch) {
    throw new CustomError("No existing match with id: " + data.matchId, ErrorCode.NO_MATCH);
  }

  // Verificar que el jugador esté en el partido
  const playerInMatch = currentMatch.teams.some((team) => team.players.some((player) => player.id === data.playerId));
  if (!playerInMatch) {
    throw new CustomError("Player is not in the match", ErrorCode.UNAUTHORIZED);
  }

  // Encontrar en qué equipo está el jugador
  const teamWithPlayer = currentMatch.teams.find((team) => team.players.some((player) => player.id === data.playerId));
  if (!teamWithPlayer) {
    throw new CustomError("Player not found in any team", ErrorCode.UNAUTHORIZED);
  }

  // Obtener información del jugador para verificar si tiene userId
  const playerToDelete = await getPlayerById(data.playerId);
  if (!playerToDelete) {
    throw new CustomError("Player not found", ErrorCode.NO_PLAYER);
  }

  // Eliminar el jugador del partido y del equipo
  // TODO - revisar que al eliminar un jugador se pueda volver a agregar al mismo jugador
  const updatedMatch = await prisma.match.update({
    where: { id: data.matchId },
    data: {
      players: {
        disconnect: { id: data.playerId }
      },
      teams: {
        update: {
          where: {
            matchId_teamNumber: {
              matchId: data.matchId,
              teamNumber: teamWithPlayer.teamNumber
            }
          },
          data: {
            players: {
              disconnect: { id: data.playerId }
            }
          }
        }
      }
    },
    include: {
      teams: {
        include: {
          players: true
        }
      },
      sets: true,
      status: true,
      applications: {
        where: {
          status: ApplicationStatus.PENDING
        }
      }
    }
  });

  // Si el jugador no tiene userId, eliminarlo completamente de la base de datos
  if (!playerToDelete.userId) {
    await prisma.player.delete({
      where: { id: data.playerId }
    });
  }

  if (currentMatch.status.name !== MATCH_STATUS.PENDING) {
    await changeState(data.matchId, MATCH_STATUS.PENDING);
  }

  return updatedMatch;
};

export const getPlayerMatchesCount = async (playerId: number) => {
  const matchesCount = await prisma.match.count({
    where: {
      AND: [
        {
          players: {
            some: {
              id: playerId
            }
          }
        },
        {
          status: {
            name: MATCH_STATUS.COMPLETED
          }
        }
      ]
    }
  });

  return matchesCount;
};
