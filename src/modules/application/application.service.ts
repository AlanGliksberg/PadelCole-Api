import { ApplicationStatus, Prisma } from "@prisma/client";
import prisma from "../../prisma/client";
import { CustomError } from "../../types/customError";
import { ErrorCode } from "../../constants/errorCode";
import { CreateApplicationBody } from "../../types/application";
import { changeApplicationStatus, getApplicationById } from "../../utils/application";
import { MATCH_STATUS } from "../../types/matchTypes";
import { addPlayerToMatchFromApplication } from "../../utils/match";

export const applyToMatch = async (playerId: number, data: CreateApplicationBody) => {
  const { matchId, teamNumber, message, phone } = data;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teams: {
        include: {
          players: true
        }
      },
      applications: true
    }
  });
  if (!match) throw new CustomError("No existing match with id: " + matchId, ErrorCode.NO_MATCH);

  // TODO - no se pueden postular el creador del partido y jugadores ya en el partido
  // TODO - validar generos
  const existingApplication = match.applications.find((app) => app.playerId === playerId);
  if (existingApplication) {
    throw new CustomError("Ya te has postulado a este partido", ErrorCode.APPLICATION_ALREADY_EXISTS);
  }

  if (teamNumber) {
    const team = match.teams.find((m) => m.teamNumber === teamNumber);
    if (team?.players && team?.players.length >= 2)
      throw new CustomError("Team is full", ErrorCode.APPLICATION_TEAM_FULL);
  }

  return await prisma.application.create({
    data: {
      match: {
        connect: {
          id: matchId
        }
      },
      player: {
        connect: {
          id: playerId
        }
      },
      teamNumber,
      message,
      phone
    }
  });
};

export const acceptApplication = async (playerId: number, applicationId: number, teamNumber: 1 | 2) => {
  const include: Prisma.ApplicationInclude = {
    match: {
      include: {
        teams: {
          include: {
            players: true
          }
        },
        status: true
      }
    }
  };
  const application = await getApplicationById(applicationId, include);

  if (!application) throw new CustomError("Invalid application", ErrorCode.APPLICATION_NO_EXIST);
  if (application.match?.creatorPlayerId !== playerId)
    throw new CustomError("Solo el creador puede rechazar la postulación", ErrorCode.UNAUTHORIZED);
  if (application.status !== ApplicationStatus.PENDING)
    throw new CustomError("Application is closed", ErrorCode.APPLICATION_CLOSED);
  if (application.match?.status.name !== MATCH_STATUS.PENDING)
    throw new CustomError("Match is closed", ErrorCode.APPLICATION_MATCH_CLOSED);
  if (application.match.teams.find((t) => t.teamNumber === application.teamNumber)!.players.length >= 2)
    throw new CustomError("Team is full", ErrorCode.APPLICATION_TEAM_FULL);

  await addPlayerToMatchFromApplication(application, teamNumber);
  return await changeApplicationStatus(applicationId, ApplicationStatus.ACCEPTED);
};

export const rejectApplication = async (playerId: number, applicationId: number) => {
  const include: Prisma.ApplicationInclude = {
    match: {
      include: {
        teams: {
          include: {
            players: true
          }
        },
        status: true
      }
    }
  };
  const application = await getApplicationById(applicationId, include);
  if (!application) throw new CustomError("Invalid application", ErrorCode.APPLICATION_NO_EXIST);
  if (application.match?.creatorPlayerId !== playerId)
    throw new CustomError("Solo el creador puede rechazar la postulación", ErrorCode.UNAUTHORIZED);
  if (application.status !== ApplicationStatus.PENDING)
    throw new CustomError("Application is closed", ErrorCode.APPLICATION_CLOSED);
  if (application.match?.status.name !== MATCH_STATUS.PENDING)
    throw new CustomError("Match is closed", ErrorCode.APPLICATION_MATCH_CLOSED);

  return await changeApplicationStatus(applicationId, ApplicationStatus.REJECTED);
};
