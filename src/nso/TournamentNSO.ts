/**
 * Tournament NSO (Network Service Object)
 * 
 * Manages bracket-based tournaments with Nostr persistence.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  TournamentData,
  TournamentBracket,
  TournamentRound,
  TournamentMatch,
  TournamentSize,
  TournamentStatus,
  NSOEndpoint,
} from '../types/arenaTypes';

export class TournamentNSO {
  private tournaments: Map<string, TournamentData> = new Map();

  getEndpoints(): NSOEndpoint[] {
    return [
      { path: '/nso/tournament/create', method: 'request', model: 'TournamentBracket' },
      { path: '/nso/tournament/join', method: 'request', model: 'TournamentBracket' },
      { path: '/nso/tournament/state', method: 'subscribe', model: 'TournamentBracket' },
      { path: '/nso/tournament/result', method: 'publish', model: 'TournamentBracket' },
    ];
  }

  /**
   * Create a new tournament
   */
  createTournament(name: string, size: TournamentSize): TournamentData {
    const tournament: TournamentData = {
      id: uuidv4(),
      name,
      status: 'registration',
      size,
      participants: [],
      bracket: { rounds: [] },
      currentRound: 0,
      createdAt: Date.now(),
    };

    this.tournaments.set(tournament.id, tournament);
    return tournament;
  }

  /**
   * Register a participant
   */
  registerParticipant(tournamentId: string, userId: string): boolean {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return false;
    if (tournament.status !== 'registration') return false;
    if (tournament.participants.length >= tournament.size) return false;
    if (tournament.participants.includes(userId)) return false;

    tournament.participants.push(userId);

    // Auto-start when full
    if (tournament.participants.length === tournament.size) {
      this.startTournament(tournamentId);
    }

    return true;
  }

  /**
   * Start the tournament and generate brackets
   */
  startTournament(tournamentId: string): boolean {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return false;
    if (tournament.participants.length < 2) return false;

    tournament.status = 'in_progress';
    tournament.startedAt = Date.now();
    tournament.currentRound = 1;
    tournament.bracket = this.generateBracket(tournament.participants);

    return true;
  }

  /**
   * Report a match result
   */
  reportMatchResult(
    tournamentId: string,
    matchId: string,
    winnerId: string,
    battleId: string
  ): boolean {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return false;

    // Find the match
    for (const round of tournament.bracket.rounds) {
      const match = round.matches.find((m) => m.matchId === matchId);
      if (match) {
        match.winnerId = winnerId;
        match.battleId = battleId;
        match.status = 'completed';

        // Check if round is complete
        const roundComplete = round.matches.every(
          (m) => m.status === 'completed'
        );
        if (roundComplete) {
          this.advanceRound(tournament);
        }

        return true;
      }
    }

    return false;
  }

  /**
   * Get tournament data
   */
  getTournament(tournamentId: string): TournamentData | undefined {
    return this.tournaments.get(tournamentId);
  }

  /**
   * Get all active tournaments
   */
  getActiveTournaments(): TournamentData[] {
    return Array.from(this.tournaments.values()).filter(
      (t) => t.status !== 'completed'
    );
  }

  // ---- Internal ----

  private generateBracket(participants: string[]): TournamentBracket {
    // Shuffle participants
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const rounds: TournamentRound[] = [];
    const totalRounds = Math.ceil(Math.log2(shuffled.length));

    // Generate first round
    const firstRoundMatches: TournamentMatch[] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      firstRoundMatches.push({
        matchId: uuidv4(),
        player1Id: shuffled[i],
        player2Id: shuffled[i + 1] || 'BYE',
        status: shuffled[i + 1] ? 'pending' : 'completed',
        winnerId: shuffled[i + 1] ? undefined : shuffled[i], // Auto-win for BYE
      });
    }
    rounds.push({ roundNumber: 1, matches: firstRoundMatches });

    // Generate placeholder rounds
    let matchCount = Math.ceil(firstRoundMatches.length / 2);
    for (let r = 2; r <= totalRounds; r++) {
      const roundMatches: TournamentMatch[] = [];
      for (let i = 0; i < matchCount; i++) {
        roundMatches.push({
          matchId: uuidv4(),
          player1Id: 'TBD',
          player2Id: 'TBD',
          status: 'pending',
        });
      }
      rounds.push({ roundNumber: r, matches: roundMatches });
      matchCount = Math.ceil(matchCount / 2);
    }

    return { rounds };
  }

  private advanceRound(tournament: TournamentData): void {
    const currentRound =
      tournament.bracket.rounds[tournament.currentRound - 1];
    const nextRound = tournament.bracket.rounds[tournament.currentRound];

    if (!nextRound) {
      // Tournament is complete
      tournament.status = 'completed';
      tournament.completedAt = Date.now();
      return;
    }

    // Fill next round with winners
    const winners = currentRound.matches
      .map((m) => m.winnerId!)
      .filter(Boolean);

    for (let i = 0; i < nextRound.matches.length; i++) {
      nextRound.matches[i].player1Id = winners[i * 2] || 'BYE';
      nextRound.matches[i].player2Id = winners[i * 2 + 1] || 'BYE';

      // Auto-win for BYE
      if (nextRound.matches[i].player2Id === 'BYE') {
        nextRound.matches[i].winnerId = nextRound.matches[i].player1Id;
        nextRound.matches[i].status = 'completed';
      }
    }

    tournament.currentRound++;
  }
}
