import { PageFilterNumber, PageFilterString } from "./common";
import { GENDER } from "./playerTypes";
import { TeamDTO } from "./team";

export interface MatchDto {
  date: Date;
  time: string;
  location: string;
  description?: string;
  categoryId: number;
  pointsDeviation: number;
  creatorPlayerId: number;
  genderId: number;
  teams?: TeamDTO;
  duration: number;
}

export type GetMatchesRequest = {
  gender?: string | string[];
  status?: string | string[];
  createdBy?: string;
  isPlayer?: string;
} & PageFilterString;

export type MatchFilters = {
  genders?: GENDER[];
  status?: MATCH_STATUS[];
  createdBy?: boolean;
  isPlayer?: boolean;
} & PageFilterNumber;

export type AddPlayerToMatchRequest = {
  matchId: number;
  teamNumber: number;
  playerId: number;
};

export enum MATCH_STATUS {
  PENDING = "PENDING",
  CLOSED = "CLOSED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}
