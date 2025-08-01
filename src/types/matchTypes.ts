import { PageFilterNumber, PageFilterString } from "./common";
import { GENDER } from "./playerTypes";
import { TeamDTO } from "./team";

export interface MatchDto {
  location: string;
  description?: string;
  date: Date;
  time: string;
  duration: number;
  genderId: number;
  categoryId: number;
  teams?: TeamDTO;
  pointsDeviation: number;
  creatorPlayerId: number;
}

export interface UpdateMatchDto {
  location?: string;
  description?: string;
  date?: Date;
  time?: string;
  duration?: number;
  genderId?: number;
  categoryId?: number;
  pointsDeviation?: number;
  teams?: TeamDTO;
}

export type GetMatchesRequest = {
  gender?: string | string[];
  status?: string | string[];
} & PageFilterString;

export type MatchFilters = {
  genders?: GENDER[];
  status?: MATCH_STATUS[];
} & PageFilterNumber;

export type AddPlayerToMatchRequest = {
  matchId: number;
  teamNumber: number;
  playerId?: number;
  firstName?: string;
  lastName?: string;
  genderId?: number;
  categoryId?: number;
  phone?: string;
  positionId?: number;
};

export type DeletePlayerFromMatchRequest = {
  matchId: number;
  playerId: number;
};

export enum MATCH_STATUS {
  PENDING = "PENDING",
  CLOSED = "CLOSED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}
