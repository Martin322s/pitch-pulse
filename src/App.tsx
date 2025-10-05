import { useEffect, useState } from "react";
import {
	Clock,
	TrendingUp,
	Users,
	AlertCircle,
	Activity,
	BarChart3,
	Calendar,
	Award,
	Shield,
	Zap,
	Brain,
	ChevronRight,
	AlertTriangle,
	DollarSign,
	Trophy,
	Target,
	Flame,
	Star,
	Goal
} from "lucide-react";

const PROXY_BASE = "https://camera-proxy-server-211m.onrender.com";
const api = (path: string) => `${PROXY_BASE}/api/football/${path}`;

const LEAGUES = [39, 140, 135, 78, 61, 172];

const LIVE_CODES = ["1H", "2H", "HT", "ET", "BT", "P", "LIVE"];

interface Match {
	id: number;
	fixtureId: number;
	league: string;
	leagueId: number;
	leagueFlag?: string;
	venue?: string;
	home: string;
	away: string;
	homeLogo?: string;
	awayLogo?: string;
	homeTeamId: number;
	awayTeamId: number;
	homeScore: number;
	awayScore: number;
	isLive: boolean;
	time: string;
	date: string;
	season: number;
	city?: string;
}

interface MatchDetails {
	fixture: any;
	liveStats: any;
	events: any[];
	lineups: any;
	players: any;
	h2h: any;
	predictions: any;
	odds: any;
	homeStats: any;
	awayStats: any;
	homeInjuries: any[];
	awayInjuries: any[];
	homeForm: any;
	awayForm: any;
	standings: any;
}

export default function FootballApp() {
	const [activeTab, setActiveTab] = useState<"live" | "today" | "tomorrow">("today");
	const [matches, setMatches] = useState<Match[]>([]);
	const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
	const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const isLiveTab = activeTab === "live";

	const fetchMatches = async () => {
		setLoading(true);
		setError("");

		try {
			const today = new Date();
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			let targetDate = today.toISOString().split("T")[0];
			if (activeTab === "tomorrow") targetDate = tomorrow.toISOString().split("T")[0];

			console.log("Fetching matches for:", targetDate);
			const res = await fetch(api(`fixtures?date=${targetDate}`));

			if (!res.ok) {
				throw new Error(`API грешка: ${res.status} ${res.statusText}`);
			}

			const data = await res.json();
			console.log("API Response:", data);

			if (!data.response || !Array.isArray(data.response)) {
				console.warn("Невалиден отговор от API:", data);
				setMatches([]);
				return;
			}

			const filtered = data.response.filter((m: any) => {
				const inLeague = LEAGUES.includes(m.league?.id);
				if (!inLeague) return false;
				const st = m.fixture?.status?.short;
				if (isLiveTab) return LIVE_CODES.includes(st);
				return ["NS", "TBD", ...LIVE_CODES].includes(st);
			});

			console.log("Filtered matches:", filtered.length);

			const formatted: Match[] = filtered.map((m: any) => ({
				id: m.fixture.id,
				fixtureId: m.fixture.id,
				league: m.league.name,
				leagueId: m.league.id,
				leagueFlag: m.league.flag,
				venue: m.fixture.venue?.name,
				home: m.teams.home.name,
				away: m.teams.away.name,
				homeLogo: m.teams.home.logo,
				awayLogo: m.teams.away.logo,
				homeTeamId: m.teams.home.id,
				awayTeamId: m.teams.away.id,
				homeScore: m.goals.home ?? 0,
				awayScore: m.goals.away ?? 0,
				isLive: LIVE_CODES.includes(m.fixture.status.short),
				time: m.fixture.status.elapsed ? `${m.fixture.status.elapsed}'` : m.fixture.status.short,
				date: new Date(m.fixture.date).toLocaleDateString("bg-BG"),
				season: 2024,
				city: m.fixture.venue?.city,
			}));

			console.log("Formatted matches:", formatted);
			setMatches(formatted);
		} catch (e: any) {
			console.error("Error fetching matches:", e);
			setError(e.message || "Нещо се обърка.");
		} finally {
			setLoading(false);
		}
	};

	const fetchCompleteMatchData = async (match: Match) => {
		setLoading(true);
		setError("");
		setMatchDetails(null);

		try {
			const isLive = match.isLive;

			const requests = [
				fetch(api(`fixtures?id=${match.fixtureId}`)),
				isLive ? fetch(api(`fixtures/statistics?fixture=${match.fixtureId}`)) : Promise.resolve({ json: async () => ({ response: null }) }),
				isLive ? fetch(api(`fixtures/events?fixture=${match.fixtureId}`)) : Promise.resolve({ json: async () => ({ response: null }) }),
				fetch(api(`fixtures/lineups?fixture=${match.fixtureId}`)),
				isLive ? fetch(api(`fixtures/players?fixture=${match.fixtureId}`)) : Promise.resolve({ json: async () => ({ response: null }) }),
				fetch(api(`fixtures/headtohead?h2h=${match.homeTeamId}-${match.awayTeamId}&last=10`)),
				fetch(api(`predictions?fixture=${match.fixtureId}`)),
				fetch(api(`odds?fixture=${match.fixtureId}`)),
				fetch(api(`teams/statistics?team=${match.homeTeamId}&season=${match.season}&league=${match.leagueId}`)),
				fetch(api(`teams/statistics?team=${match.awayTeamId}&season=${match.season}&league=${match.leagueId}`)),
				fetch(api(`injuries?team=${match.homeTeamId}&season=${match.season}`)),
				fetch(api(`injuries?team=${match.awayTeamId}&season=${match.season}`)),
				fetch(api(`fixtures?team=${match.homeTeamId}&last=10&season=${match.season}`)),
				fetch(api(`fixtures?team=${match.awayTeamId}&last=10&season=${match.season}`)),
				fetch(api(`players/squads?team=${match.homeTeamId}`)),
				fetch(api(`players/squads?team=${match.awayTeamId}`)),
				fetch(api(`standings?season=${match.season}&league=${match.leagueId}`)),
			];

			const responses = await Promise.all(requests);
			const jsons = await Promise.all(responses.map((r: any) => r.json()));

			const [
				fixtureData,
				statsData,
				eventsData,
				lineupData,
				playersData,
				h2hData,
				predictionsData,
				oddsData,
				homeStatsData,
				awayStatsData,
				homeInjuriesData,
				awayInjuriesData,
				homeFormData,
				awayFormData,
				homeSquadData,
				awaySquadData,
				standingsData,
			] = jsons;

			const details: MatchDetails = {
				fixture: fixtureData.response?.[0] ?? null,
				liveStats: processLiveStats(statsData),
				events: processEvents(eventsData),
				lineups: processLineups(lineupData),
				players: processPlayers(playersData),
				h2h: processH2H(h2hData, match),
				predictions: processPredictions(predictionsData),
				odds: processOdds(oddsData),
				homeStats: processTeamStats(homeStatsData),
				awayStats: processTeamStats(awayStatsData),
				homeInjuries: processInjuries(homeInjuriesData),
				awayInjuries: processInjuries(awayInjuriesData),
				homeForm: processForm(homeFormData, match.homeTeamId),
				awayForm: processForm(awayFormData, match.awayTeamId),
				standings: processStandings(standingsData, match),
			};

			setMatchDetails(details);
		} catch (e: any) {
			console.error(e);
			setError("Не мога да заредя детайлите.");
		} finally {
			setLoading(false);
		}
	};

	const getStat = (arr: any[], type: string): number => {
		if (!arr) return 0;
		const f = arr.find((s: any) => s.type === type);
		if (!f || f.value == null) return 0;
		if (typeof f.value === "string") {
			return f.value.includes("%") ? parseInt(f.value) || 0 : parseInt(f.value) || 0;
		}
		return f.value || 0;
	};

	const processLiveStats = (data: any) => {
		if (!data?.response || data.response.length < 2) return null;
		const home = data.response[0].statistics;
		const away = data.response[1].statistics;

		return {
			possession: { home: getStat(home, "Ball Possession"), away: getStat(away, "Ball Possession") },
			shots: { home: getStat(home, "Total Shots"), away: getStat(away, "Total Shots") },
			shotsOnTarget: { home: getStat(home, "Shots on Goal"), away: getStat(away, "Shots on Goal") },
			shotsOffTarget: { home: getStat(home, "Shots off Goal"), away: getStat(away, "Shots off Goal") },
			blocked: { home: getStat(home, "Blocked Shots"), away: getStat(away, "Blocked Shots") },
			corners: { home: getStat(home, "Corner Kicks"), away: getStat(away, "Corner Kicks") },
			offsides: { home: getStat(home, "Offsides"), away: getStat(away, "Offsides") },
			fouls: { home: getStat(home, "Fouls"), away: getStat(away, "Fouls") },
			yellowCards: { home: getStat(home, "Yellow Cards"), away: getStat(away, "Yellow Cards") },
			redCards: { home: getStat(home, "Red Cards"), away: getStat(away, "Red Cards") },
			saves: { home: getStat(home, "Goalkeeper Saves"), away: getStat(away, "Goalkeeper Saves") },
			passes: { home: getStat(home, "Total passes"), away: getStat(away, "Total passes") },
			passAccuracy: { home: getStat(home, "Passes %"), away: getStat(away, "Passes %") },
		};
	};

	const processEvents = (data: any) => {
		if (!data?.response) return [];
		return data.response
			.map((e: any) => ({
				time: e.time.elapsed + (e.time.extra ? `+${e.time.extra}` : "") + "'",
				team: e.team?.name,
				player: e.player?.name,
				assist: e.assist?.name,
				type: e.type,
				detail: e.detail,
			}))
			.reverse();
	};

	const processLineups = (data: any) => {
		if (!data?.response || data.response.length < 2) return null;
		return {
			home: {
				formation: data.response[0]?.formation || "N/A",
				coach: data.response[0]?.coach?.name || "N/A",
				startXI:
					data.response[0]?.startXI?.map((p: any) => ({
						name: p.player.name,
						number: p.player.number,
						pos: p.player.pos,
						grid: p.player.grid,
					})) ?? [],
				substitutes:
					data.response[0]?.substitutes?.map((p: any) => ({
						name: p.player.name,
						number: p.player.number,
						pos: p.player.pos,
					})) ?? [],
			},
			away: {
				formation: data.response[1]?.formation || "N/A",
				coach: data.response[1]?.coach?.name || "N/A",
				startXI:
					data.response[1]?.startXI?.map((p: any) => ({
						name: p.player.name,
						number: p.player.number,
						pos: p.player.pos,
						grid: p.player.grid,
					})) ?? [],
				substitutes:
					data.response[1]?.substitutes?.map((p: any) => ({
						name: p.player.name,
						number: p.player.number,
						pos: p.player.pos,
					})) ?? [],
			},
		};
	};

	const processPlayers = (data: any) => {
		if (!data?.response || data.response.length < 2) return null;

		const top = (teamData: any) =>
			teamData.players
				.filter((p: any) => p.statistics?.[0]?.games?.minutes > 0)
				.map((p: any) => ({
					name: p.player.name,
					photo: p.player.photo,
					rating: p.statistics[0].games.rating,
					goals: p.statistics[0].goals.total || 0,
					assists: p.statistics[0].goals.assists || 0,
					shots: p.statistics[0].shots.total || 0,
					passes: p.statistics[0].passes.total || 0,
					passAccuracy: p.statistics[0].passes.accuracy || 0,
					dribbles: p.statistics[0].dribbles?.success || 0,
					duels: p.statistics[0].duels?.won || 0,
				}))
				.sort((a: any, b: any) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0))
				.slice(0, 5);

		return { home: top(data.response[0]), away: top(data.response[1]) };
	};

	const processH2H = (data: any, match: Match) => {
		if (!data?.response?.length) return { matches: [], summary: {} };

		const mini = data.response.slice(0, 5).map((m: any) => ({
			date: new Date(m.fixture.date).toLocaleDateString("bg-BG"),
			home: m.teams.home.name,
			away: m.teams.away.name,
			score: `${m.goals.home}-${m.goals.away}`,
			league: m.league.name,
		}));

		let homeWins = 0,
			awayWins = 0,
			draws = 0,
			totalGoals = 0;

		data.response.forEach((m: any) => {
			totalGoals += (m.goals.home ?? 0) + (m.goals.away ?? 0);
			if (m.goals.home > m.goals.away) {
				if (m.teams.home.id === match.homeTeamId) homeWins++;
				else awayWins++;
			} else if (m.goals.home < m.goals.away) {
				if (m.teams.away.id === match.awayTeamId) awayWins++;
				else homeWins++;
			} else {
				draws++;
			}
		});

		return {
			matches: mini,
			summary: {
				homeWins,
				awayWins,
				draws,
				avgGoals: (totalGoals / data.response.length).toFixed(1),
			},
		};
	};

	const processPredictions = (data: any) => {
		if (!data?.response?.length) return null;
		const pred = data.response[0];
		return {
			winner: pred.predictions?.winner,
			winOrDraw: pred.predictions?.win_or_draw,
			underOver: pred.predictions?.under_over,
			goalsHome: pred.predictions?.goals?.home,
			goalsAway: pred.predictions?.goals?.away,
			advice: pred.predictions?.advice,
			percentages: pred.predictions?.percent,
		};
	};

	const processOdds = (data: any) => {
		const bookie = data?.response?.[0]?.bookmakers?.[0];
		if (!bookie) return null;

		const odds: any = {};
		for (const bet of bookie.bets || []) {
			if (bet.name === "Match Winner") {
				odds.matchWinner = {
					home: bet.values.find((v: any) => v.value === "Home")?.odd,
					draw: bet.values.find((v: any) => v.value === "Draw")?.odd,
					away: bet.values.find((v: any) => v.value === "Away")?.odd,
				};
			}
			if (bet.name === "Goals Over/Under") {
				odds.overUnder = {
					over25: bet.values.find((v: any) => v.value === "Over 2.5")?.odd,
					under25: bet.values.find((v: any) => v.value === "Under 2.5")?.odd,
				};
			}
			if (bet.name === "Both Teams Score") {
				odds.btts = {
					yes: bet.values.find((v: any) => v.value === "Yes")?.odd,
					no: bet.values.find((v: any) => v.value === "No")?.odd,
				};
			}
		}

		return { bookmaker: bookie.name, odds };
	};

	const processTeamStats = (data: any) => {
		if (!data?.response) return null;
		return {
			form: data.response.form,
			fixtures: data.response.fixtures,
			goals: data.response.goals,
			biggest: data.response.biggest,
			cleanSheet: data.response.clean_sheet,
			penalty: data.response.penalty,
			lineups: data.response.lineups,
			cards: data.response.cards,
		};
	};

	const processInjuries = (data: any) => {
		if (!data?.response) return [];
		return data.response.slice(0, 10).map((inj: any) => ({
			player: inj.player.name,
			photo: inj.player.photo,
			reason: inj.player.reason,
		}));
	};

	const processForm = (data: any, teamId: number) => {
		if (!data?.response || !Array.isArray(data.response) || data.response.length === 0) {
			console.log("No form data for team:", teamId);
			return { form: "", last5: [] };
		}
		const last5 = data.response.slice(0, 5);
		const last5Matches = last5.map((m: any) => ({
			date: new Date(m.fixture.date).toLocaleDateString("bg-BG"),
			opponent: m.teams.home.id === teamId ? m.teams.away.name : m.teams.home.name,
			score: `${m.goals.home}-${m.goals.away}`,
			result:
				(m.teams.home.id === teamId ? m.goals.home : m.goals.away) >
					(m.teams.home.id === teamId ? m.goals.away : m.goals.home)
					? "W"
					: (m.teams.home.id === teamId ? m.goals.home : m.goals.away) <
						(m.teams.home.id === teamId ? m.goals.away : m.goals.home)
						? "L"
						: "D",
		}));
		console.log("Processed form for team", teamId, ":", last5Matches.map((m: any) => m.result).join(""));
		return { form: last5Matches.map((m: any) => m.result).join(""), last5: last5Matches };
	};

	const processStandings = (data: any, match: Match) => {
		console.log("Standings data:", data);
		const table = data?.response?.[0]?.league?.standings?.[0] || [];
		const home = table.find((t: any) => t.team.id === match.homeTeamId);
		const away = table.find((t: any) => t.team.id === match.awayTeamId);
		console.log("Standings - Home:", home, "Away:", away);
		return { home, away, table: table.slice(0, 10) };
	};

	const extractFormFromStats = (stats: any) => {
		if (!stats) {
			console.log("No stats for extractFormFromStats");
			return { form: "", wins: 0, draws: 0, losses: 0 };
		}

		if (!stats.form || stats.form === "") {
			console.log("No form string in stats");
			return { form: "", wins: 0, draws: 0, losses: 0 };
		}

		const form = stats.form.split("").slice(0, 5).join("");
		const wins = (form.match(/W/g) || []).length;
		const draws = (form.match(/D/g) || []).length;
		const losses = (form.match(/L/g) || []).length;

		console.log("Extracted form:", form, "W:", wins, "D:", draws, "L:", losses);
		return { form, wins, draws, losses };
	};

	const extractStandingFromStats = (stats: any, teamName: string) => {
		if (!stats) {
			console.log("No stats for extractStandingFromStats:", teamName);
			return null;
		}

		const played = stats.fixtures?.played?.total || 0;
		const wins = stats.fixtures?.wins?.total || 0;
		const draws = stats.fixtures?.draws?.total || 0;
		const losses = stats.fixtures?.loses?.total || 0;
		const goalsFor = stats.goals?.for?.total?.total || 0;
		const goalsAgainst = stats.goals?.against?.total?.total || 0;
		const points = wins * 3 + draws;

		if (played === 0 && wins === 0 && draws === 0 && losses === 0) {
			console.log("No fixtures data for:", teamName);
			return null;
		}

		return {
			team: { name: teamName },
			rank: "N/A",
			points,
			all: { played, win: wins, draw: draws, lose: losses },
			goalsDiff: goalsFor - goalsAgainst,
		};
	};

	const generateAIAnalysis = (match: Match, details: MatchDetails) => {
		const analysis: any = {
			homeAnalysis: [],
			awayAnalysis: [],
			bettingTips: [],
			prediction: "",
			confidence: 0,
		};

		const homeInjuries = details.homeInjuries?.length || 0;
		const awayInjuries = details.awayInjuries?.length || 0;

		const homeFormData = details.homeForm?.form ? details.homeForm : { form: extractFormFromStats(details.homeStats).form };
		const awayFormData = details.awayForm?.form ? details.awayForm : { form: extractFormFromStats(details.awayStats).form };

		const homeForm = homeFormData.form || extractFormFromStats(details.homeStats).form;
		const awayForm = awayFormData.form || extractFormFromStats(details.awayStats).form;

		const homeStats = details.homeStats;
		const awayStats = details.awayStats;
		const h2h = details.h2h;

		const homeStanding = details.standings?.home || extractStandingFromStats(homeStats, match.home);
		const awayStanding = details.standings?.away || extractStandingFromStats(awayStats, match.away);
		const standings = { home: homeStanding, away: awayStanding };

		let homeScore = 0;
		let awayScore = 0;

		if (homeForm) {
			const homeWins = (homeForm.match(/W/g) || []).length;
			const homeLosses = (homeForm.match(/L/g) || []).length;
			if (homeWins >= 3) {
				analysis.homeAnalysis.push(`${match.home} е в отлична форма с ${homeWins} победи в последните 5 мача`);
				homeScore += 2;
			} else if (homeWins <= 1) {
				analysis.homeAnalysis.push(`${match.home} преминава през труден период с само ${homeWins} победи в последните 5 мача`);
				homeScore -= 1;
			}
		}

		if (awayForm) {
			const awayWins = (awayForm.match(/W/g) || []).length;
			const awayLosses = (awayForm.match(/L/g) || []).length;
			if (awayWins >= 3) {
				analysis.awayAnalysis.push(`${match.away} е в отлична форма с ${awayWins} победи в последните 5 мача`);
				awayScore += 2;
			} else if (awayWins <= 1) {
				analysis.awayAnalysis.push(`${match.away} преминава през труден период с само ${awayWins} победи в последните 5 мача`);
				awayScore -= 1;
			}
		}

		if (homeInjuries > 3) {
			analysis.homeAnalysis.push(`⚠️ ${match.home} има ${homeInjuries} контузени играчи - сериозен проблем за състава`);
			homeScore -= 2;
		} else if (homeInjuries > 0) {
			analysis.homeAnalysis.push(`${match.home} има ${homeInjuries} контузени играчи`);
			homeScore -= 1;
		}

		if (awayInjuries > 3) {
			analysis.awayAnalysis.push(`⚠️ ${match.away} има ${awayInjuries} контузени играчи - сериозен проблем за състава`);
			awayScore -= 2;
		} else if (awayInjuries > 0) {
			analysis.awayAnalysis.push(`${match.away} има ${awayInjuries} контузени играчи`);
			awayScore -= 1;
		}

		if (homeStats) {
			const homeAvgGoals = homeStats.goals?.for?.average?.total || 0;
			const homeAvgConceded = homeStats.goals?.against?.average?.total || 0;

			if (homeAvgGoals > 2) {
				analysis.homeAnalysis.push(`${match.home} вкарва средно ${homeAvgGoals} гола на мач - мощна атака`);
				homeScore += 1;
			}
			if (homeAvgConceded < 1) {
				analysis.homeAnalysis.push(`${match.home} има солидна защита с само ${homeAvgConceded} допуснати гола средно`);
				homeScore += 1;
			}
		}

		if (awayStats) {
			const awayAvgGoals = awayStats.goals?.for?.average?.total || 0;
			const awayAvgConceded = awayStats.goals?.against?.average?.total || 0;

			if (awayAvgGoals > 2) {
				analysis.awayAnalysis.push(`${match.away} вкарва средно ${awayAvgGoals} гола на мач - мощна атака`);
				awayScore += 1;
			}
			if (awayAvgConceded < 1) {
				analysis.awayAnalysis.push(`${match.away} има солидна защита с само ${awayAvgConceded} допуснати гола средно`);
				awayScore += 1;
			}
		}

		if (standings?.home && standings?.away) {
			const rankDiff = standings.away.rank - standings.home.rank;
			if (rankDiff > 5) {
				analysis.homeAnalysis.push(`${match.home} е на ${standings.home.rank} място, значително по-високо от ${match.away} (${standings.away.rank} място)`);
				homeScore += 2;
			} else if (rankDiff < -5) {
				analysis.awayAnalysis.push(`${match.away} е на ${standings.away.rank} място, значително по-високо от ${match.home} (${standings.home.rank} място)`);
				awayScore += 2;
			}
		}

		if (h2h?.summary) {
			if (h2h.summary.homeWins > h2h.summary.awayWins + 2) {
				analysis.homeAnalysis.push(`${match.home} доминира в директните сблъсъци с ${h2h.summary.homeWins} победи срещу ${h2h.summary.awayWins}`);
				homeScore += 1;
			} else if (h2h.summary.awayWins > h2h.summary.homeWins + 2) {
				analysis.awayAnalysis.push(`${match.away} доминира в директните сблъсъци с ${h2h.summary.awayWins} победи срещу ${h2h.summary.homeWins}`);
				awayScore += 1;
			}

			const avgGoals = parseFloat(h2h.summary.avgGoals || "0");
			if (avgGoals > 3) {
				analysis.bettingTips.push({
					tip: "Над 2.5 гола",
					reason: `Директните мачове са голови - средно ${avgGoals} гола на мач`,
					confidence: "висока",
					icon: "⚽"
				});
			}
		}

		if (details.predictions?.winner) {
			analysis.prediction = `${details.predictions.winner.name} фаворит`;
			const predPercent = details.predictions.percentages?.home || details.predictions.percentages?.away || 50;
			analysis.confidence = parseInt(predPercent) || 50;

			if (details.predictions.winner.id === match.homeTeamId) {
				analysis.bettingTips.push({
					tip: `1 (Победа за ${match.home})`,
					reason: details.predictions.winner.comment || "Препоръка от API прогноза",
					confidence: "висока",
					icon: "🏆"
				});
			} else {
				analysis.bettingTips.push({
					tip: `2 (Победа за ${match.away})`,
					reason: details.predictions.winner.comment || "Препоръка от API прогноза",
					confidence: "висока",
					icon: "🏆"
				});
			}
		} else if (homeScore > awayScore + 2) {
			analysis.prediction = `${match.home} фаворит`;
			analysis.confidence = Math.min(85, 60 + homeScore * 5);
			analysis.bettingTips.push({
				tip: `1 (Победа за ${match.home})`,
				reason: "По-добра форма, по-малко контузени и преимущество домакин",
				confidence: "висока",
				icon: "🏆"
			});
		} else if (awayScore > homeScore + 2) {
			analysis.prediction = `${match.away} фаворит`;
			analysis.confidence = Math.min(85, 60 + awayScore * 5);
			analysis.bettingTips.push({
				tip: `2 (Победа за ${match.away})`,
				reason: "По-добра форма и по-силен отбор",
				confidence: "висока",
				icon: "🏆"
			});
		} else {
			analysis.prediction = "Оспорван мач";
			analysis.confidence = 50;
			analysis.bettingTips.push({
				tip: "X (Равен)",
				reason: "Отборите са равностойни по форма и състав",
				confidence: "средна",
				icon: "⚖️"
			});
		}

		if (details.predictions?.advice) {
			analysis.bettingTips.push({
				tip: details.predictions.advice,
				reason: "Препоръка базирана на статистически модел",
				confidence: "висока",
				icon: "🎯"
			});
		}

		if (details.odds?.odds?.matchWinner) {
			const odds = details.odds.odds.matchWinner;
			const lowestOdd = Math.min(
				parseFloat(odds.home || 999),
				parseFloat(odds.draw || 999),
				parseFloat(odds.away || 999)
			);
			let oddTip = "";
			if (lowestOdd === parseFloat(odds.home || 999)) oddTip = `1 - ${match.home} (коеф. ${odds.home})`;
			else if (lowestOdd === parseFloat(odds.draw || 999)) oddTip = `X - Равен (коеф. ${odds.draw})`;
			else oddTip = `2 - ${match.away} (коеф. ${odds.away})`;

			if (lowestOdd < 2.0) {
				analysis.bettingTips.push({
					tip: oddTip,
					reason: `Най-нисък коефициент от ${details.odds.bookmaker}`,
					confidence: "висока",
					icon: "💰"
				});
			}
		}

		const totalAvgGoals = ((homeStats?.goals?.for?.average?.total || 0) + (awayStats?.goals?.for?.average?.total || 0)) / 2;
		if (totalAvgGoals > 2.5) {
			analysis.bettingTips.push({
				tip: "Над 2.5 гола",
				reason: `Двата отбора вкарват много голове - средно ${totalAvgGoals.toFixed(1)} на мач`,
				confidence: "средна",
				icon: "⚽"
			});
		} else if (totalAvgGoals < 1.5) {
			analysis.bettingTips.push({
				tip: "Под 2.5 гола",
				reason: `Двата отбора рядко вкарват голове - средно ${totalAvgGoals.toFixed(1)} на мач`,
				confidence: "средна",
				icon: "🛡️"
			});
		}

		if ((homeStats?.goals?.for?.average?.total || 0) > 1.5 && (awayStats?.goals?.for?.average?.total || 0) > 1.5) {
			analysis.bettingTips.push({
				tip: "BTTS - Да (И двата вкарват)",
				reason: "И двата отбора имат силна атака и вкарват редовно",
				confidence: "средна",
				icon: "🎯"
			});
		}

		if (details.odds?.odds?.btts) {
			const bttsYes = parseFloat(details.odds.odds.btts.yes || 999);
			const bttsNo = parseFloat(details.odds.odds.btts.no || 999);
			if (bttsYes < bttsNo) {
				analysis.bettingTips.push({
					tip: `BTTS Да (коеф. ${details.odds.odds.btts.yes})`,
					reason: "Най-добър коефициент за и двата отбора да вкарат",
					confidence: "средна",
					icon: "⚽"
				});
			}
		}

		if (homeStats?.goals?.for?.average?.total && homeStats.goals.for.average.total > 1.8) {
			analysis.bettingTips.push({
				tip: `${match.home} да вкара`,
				reason: `Средно ${homeStats.goals.for.average.total} гола на мач`,
				confidence: "средна",
				icon: "⚽"
			});
		}

		if (awayStats?.goals?.for?.average?.total && awayStats.goals.for.average.total > 1.8) {
			analysis.bettingTips.push({
				tip: `${match.away} да вкара`,
				reason: `Средно ${awayStats.goals.for.average.total} гола на мач`,
				confidence: "средна",
				icon: "⚽"
			});
		}

		const homeCleanSheets = homeStats?.clean_sheet?.home || 0;
		const awayCleanSheets = awayStats?.clean_sheet?.away || 0;
		if (homeCleanSheets > 5) {
			analysis.bettingTips.push({
				tip: `${match.home} "чиста мрежа"`,
				reason: `${homeCleanSheets} мача без допуснат гол`,
				confidence: "средна",
				icon: "🛡️"
			});
		}

		if (details.odds?.odds?.overUnder) {
			const over25 = parseFloat(details.odds.odds.overUnder.over25 || 999);
			const under25 = parseFloat(details.odds.odds.overUnder.under25 || 999);
			if (over25 < under25 && over25 < 2.0) {
				analysis.bettingTips.push({
					tip: `Над 2.5 гола (коеф. ${details.odds.odds.overUnder.over25})`,
					reason: "Ниски коефициенти за много голове",
					confidence: "висока",
					icon: "⚽"
				});
			} else if (under25 < over25 && under25 < 2.0) {
				analysis.bettingTips.push({
					tip: `Под 2.5 гола (коеф. ${details.odds.odds.overUnder.under25})`,
					reason: "Ниски коефициенти за малко голове",
					confidence: "висока",
					icon: "🛡️"
				});
			}
		}

		if (details.predictions?.goalsHome && details.predictions?.goalsAway) {
			const predictedTotal = parseFloat(details.predictions.goalsHome) + parseFloat(details.predictions.goalsAway);
			if (predictedTotal > 2.5) {
				analysis.bettingTips.push({
					tip: `Над 2.5 гола (прогноза: ${predictedTotal.toFixed(1)})`,
					reason: `API прогнозира ${details.predictions.goalsHome}-${details.predictions.goalsAway}`,
					confidence: "средна",
					icon: "🎯"
				});
			}
		}

		return analysis;
	};

	useEffect(() => {
		fetchMatches();
		const int = isLiveTab ? setInterval(fetchMatches, 30000) : null;
		return () => {
			if (int) clearInterval(int);
		};
	}, [activeTab, isLiveTab]);

	const StatBar = ({ label, home, away, homeColor = "bg-gradient-to-r from-emerald-500 to-green-600", awayColor = "bg-gradient-to-r from-rose-500 to-red-600" }: any) => {
		const total = (home || 0) + (away || 0) || 1;
		const homePercent = (home / total) * 100;
		return (
			<div className="mb-6 group">
				<div className="flex justify-between text-sm mb-2">
					<span className="font-bold text-white group-hover:text-emerald-400 transition-colors">{home}</span>
					<span className="font-semibold text-slate-400 uppercase tracking-wider text-xs">{label}</span>
					<span className="font-bold text-white group-hover:text-rose-400 transition-colors">{away}</span>
				</div>
				<div className="relative flex h-3 bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-slate-700/50 shadow-inner">
					<div className={`${homeColor} transition-all duration-700 ease-out shadow-lg`} style={{ width: `${homePercent}%` }} />
					<div className={`${awayColor} transition-all duration-700 ease-out shadow-lg`} style={{ width: `${100 - homePercent}%` }} />
				</div>
			</div>
		);
	};

	if (selectedMatch && matchDetails) {
		const m = selectedMatch;
		const d = matchDetails;

		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
				<header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/80 border-b border-white/10 shadow-2xl">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 grid place-items-center shadow-lg shadow-emerald-500/30">
								<Goal size={20} className="text-white" />
							</div>
							<div className="font-black tracking-tight text-lg">
								<span className="text-white">Pitch</span>
								<span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">Pulse</span>
							</div>
						</div>
						<button
							onClick={() => {
								setSelectedMatch(null);
								setMatchDetails(null);
							}}
							className="group px-4 py-2 rounded-xl font-bold border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2"
						>
							<ChevronRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={18} />
							Назад
						</button>
					</div>
				</header>

				<main className="relative z-10 px-4 sm:px-6 py-8 mx-auto max-w-7xl">
					<div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-3xl p-6 md:p-10 mb-8 shadow-2xl overflow-hidden border border-slate-700/50">
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_50%)]" />
						<div className="relative z-10">
							<div className="text-center mb-6 flex flex-wrap items-center justify-center gap-3">
								{m.leagueFlag && <img src={m.leagueFlag} className="w-7 h-5 rounded shadow-lg" alt="flag" />}
								<span className="font-bold text-base md:text-lg text-slate-300">{m.league}</span>
								<Trophy className="text-yellow-400" size={18} />
							</div>

							<div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-6">
								<TeamBlock
									name={m.home}
									logo={m.homeLogo}
									bigScore={m.isLive ? m.homeScore : null}
									side="home"
								/>
								<CenterBlock isLive={m.isLive} date={m.date} time={m.time} />
								<TeamBlock
									name={m.away}
									logo={m.awayLogo}
									bigScore={m.isLive ? m.awayScore : null}
									side="away"
								/>
							</div>
						</div>
					</div>

					<AIAnalysisSection match={m} details={d} aiAnalysis={generateAIAnalysis(m, d)} />

					<Section title="Последна форма" icon={<TrendingUp className="text-blue-400" size={28} />}>
						<div className="grid lg:grid-cols-2 gap-6">
							<FormCard
								team={m.home}
								form={d.homeForm?.last5?.length > 0 ? d.homeForm : { form: extractFormFromStats(d.homeStats).form, last5: [] }}
								stats={d.homeStats}
								color="emerald"
							/>
							<FormCard
								team={m.away}
								form={d.awayForm?.last5?.length > 0 ? d.awayForm : { form: extractFormFromStats(d.awayStats).form, last5: [] }}
								stats={d.awayStats}
								color="rose"
							/>
						</div>
					</Section>

					{m.isLive && d.liveStats && (
						<Section title="Live Статистики" icon={<Activity className="text-emerald-400" size={28} />}>
							<StatBar label="Владение (%)" home={d.liveStats.possession.home} away={d.liveStats.possession.away} />
							<StatBar label="Удари" home={d.liveStats.shots.home} away={d.liveStats.shots.away} />
							<StatBar label="В рамката" home={d.liveStats.shotsOnTarget.home} away={d.liveStats.shotsOnTarget.away} homeColor="bg-gradient-to-r from-green-500 to-emerald-600" awayColor="bg-gradient-to-r from-amber-500 to-orange-600" />
							<StatBar label="Извън рамката" home={d.liveStats.shotsOffTarget.home} away={d.liveStats.shotsOffTarget.away} homeColor="bg-gradient-to-r from-yellow-500 to-amber-600" awayColor="bg-gradient-to-r from-red-500 to-rose-600" />
							<StatBar label="Блокирани" home={d.liveStats.blocked.home} away={d.liveStats.blocked.away} homeColor="bg-gradient-to-r from-violet-500 to-purple-600" awayColor="bg-gradient-to-r from-pink-500 to-rose-600" />
							<StatBar label="Корнери" home={d.liveStats.corners.home} away={d.liveStats.corners.away} />
							<StatBar label="Засади" home={d.liveStats.offsides.home} away={d.liveStats.offsides.away} />
							<StatBar label="Фаулове" home={d.liveStats.fouls.home} away={d.liveStats.fouls.away} />
							<StatBar label="Жълти" home={d.liveStats.yellowCards.home} away={d.liveStats.yellowCards.away} />
							<StatBar label="Спасявания" home={d.liveStats.saves.home} away={d.liveStats.saves.away} />
							<StatBar label="Пасове" home={d.liveStats.passes.home} away={d.liveStats.passes.away} />
							<StatBar label="Точност (%)" home={d.liveStats.passAccuracy.home} away={d.liveStats.passAccuracy.away} />
						</Section>
					)}

					{d.events?.length > 0 && (
						<Section title="Хронология на мача" icon={<Activity className="text-yellow-400" size={28} />}>
							<div className="space-y-3">
								{d.events.map((evt: any, idx: number) => (
									<EventRow key={idx} evt={evt} />
								))}
							</div>
						</Section>
					)}

					{d.players && (
						<Section title="Топ играчи" icon={<Award className="text-yellow-400" size={28} />}>
							<div className="grid lg:grid-cols-2 gap-6">
								<TopPlayers title={m.home} color="emerald" players={d.players.home} />
								<TopPlayers title={m.away} color="rose" players={d.players.away} />
							</div>
						</Section>
					)}

					{d.lineups && (
						<Section title="Съставите" icon={<Users className="text-blue-400" size={28} />}>
							<div className="grid lg:grid-cols-2 gap-6">
								<LineupCard side="home" team={m.home} data={d.lineups.home} />
								<LineupCard side="away" team={m.away} data={d.lineups.away} />
							</div>
						</Section>
					)}

					{d.h2h?.matches?.length > 0 && (
						<Section title="Head-to-Head" icon={<Shield className="text-blue-400" size={28} />}>
							<H2HSummary d={d} m={m} />
							<div className="mt-4 space-y-2">
								{d.h2h.matches.map((hm: any, idx: number) => (
									<div key={idx} className="backdrop-blur-sm bg-white/5 rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row justify-between items-center gap-2 hover:bg-white/10 transition-all border border-white/10 hover:border-white/30">
										<span className="text-xs md:text-sm text-slate-400">{hm.date}</span>
										<span className="font-bold text-center flex-1 mx-2 text-sm md:text-base">{hm.home} vs {hm.away}</span>
										<span className="text-xl md:text-2xl font-black text-emerald-400">{hm.score}</span>
									</div>
								))}
							</div>
						</Section>
					)}

					{d.predictions && (
						<SectionGradient title="API Прогноза" icon={<Brain className="text-purple-300" size={28} />} gradient="from-purple-900/40 to-pink-900/40" border="border-purple-500/50">
							<PredictionsGrid d={d} m={m} />
						</SectionGradient>
					)}

					{d.odds && (
						<SectionGradient title={`Реални коефициенти (${d.odds.bookmaker})`} icon={<DollarSign className="text-green-300" size={28} />} gradient="from-green-900/40 to-emerald-900/40" border="border-green-500/50">
							<OddsGrid d={d} m={m} />
						</SectionGradient>
					)}

					<div className="grid lg:grid-cols-2 gap-6 mb-8">
						{d.homeStats && <TeamStatsCard teamName={m.home} stats={d.homeStats} accent="emerald" />}
						{d.awayStats && <TeamStatsCard teamName={m.away} stats={d.awayStats} accent="rose" />}
					</div>

					{(d.homeInjuries.length > 0 || d.awayInjuries.length > 0) && (
						<SectionGradient title="Контузени" icon={<AlertTriangle className="text-red-300" size={28} />} gradient="from-red-900/30 to-rose-900/30" border="border-red-500/50">
							<div className="grid lg:grid-cols-2 gap-6">
								{d.homeInjuries.length > 0 && <InjuriesList title={m.home} color="emerald" injuries={d.homeInjuries} />}
								{d.awayInjuries.length > 0 && <InjuriesList title={m.away} color="rose" injuries={d.awayInjuries} />}
							</div>
						</SectionGradient>
					)}

					<Section title="Класиране" icon={<BarChart3 className="text-purple-400" size={28} />}>
						<div className="grid md:grid-cols-2 gap-6">
							<StandingCard
								color="emerald"
								teamName={m.home}
								standing={d.standings?.home || extractStandingFromStats(d.homeStats, m.home)}
							/>
							<StandingCard
								color="rose"
								teamName={m.away}
								standing={d.standings?.away || extractStandingFromStats(d.awayStats, m.away)}
							/>
						</div>
					</Section>
				</main>

				<Footer />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
			<header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/80 border-b border-white/10 shadow-2xl">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
					<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 grid place-items-center shadow-lg shadow-emerald-500/30">
								<Goal size={20} className="text-white" />
							</div>
							<div className="font-black tracking-tight text-lg">
								<span className="text-white">Pitch</span>
								<span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">Pulse</span>
							</div>
						</div>

						<nav className="flex gap-2" aria-label="Навигация по дни">
							<TabButton icon={<Clock size={16} />} active={activeTab === "live"} onClick={() => setActiveTab("live")} label="Live" />
							<TabButton icon={<Calendar size={16} />} active={activeTab === "today"} onClick={() => setActiveTab("today")} label="Днес" />
							<TabButton icon={<TrendingUp size={16} />} active={activeTab === "tomorrow"} onClick={() => setActiveTab("tomorrow")} label="Утре" />
						</nav>
					</div>
				</div>
			</header>

			<main className="relative z-10 px-4 sm:px-6 py-8 mx-auto max-w-7xl">
				<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-8 text-center bg-gradient-to-r from-emerald-400 via-green-500 to-teal-600 bg-clip-text text-transparent drop-shadow-2xl leading-tight">
					Всичко за футбола. На едно място.
				</h1>

				{loading && <LoadingGrid />}

				{error && !loading && (
					<div className="backdrop-blur-xl bg-red-900/30 border-2 border-red-500 rounded-3xl p-6 sm:p-10 text-center max-w-2xl mx-auto shadow-2xl">
						<AlertCircle className="mx-auto mb-6 text-red-400" size={64} />
						<p className="text-2xl sm:text-3xl font-black mb-2">Грешка</p>
						<p className="text-slate-300 mb-6 text-sm sm:text-base">{error}</p>
						<button
							onClick={fetchMatches}
							className="px-6 sm:px-8 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-2xl font-black text-base sm:text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
						>
							Опитай отново
						</button>
					</div>
				)}

				{!loading && !error && matches.length === 0 && (
					<div className="backdrop-blur-xl bg-white/5 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto border border-white/10 shadow-2xl">
						<Clock className="mx-auto mb-6 text-slate-500" size={64} />
						<p className="text-2xl sm:text-3xl font-black mb-2">Няма мачове</p>
						<p className="text-slate-400 text-sm sm:text-base">
							{activeTab === "live" && "В момента няма мачове на живо."}
							{activeTab === "today" && "Няма мачове днес."}
							{activeTab === "tomorrow" && "Няма мачове утре."}
						</p>
					</div>
				)}

				{!loading && !error && matches.length > 0 && (
					<>
						<div className="mb-6 text-center">
							<span className="backdrop-blur-xl bg-white/10 px-4 sm:px-6 py-2 sm:py-3 rounded-full font-black text-sm sm:text-base md:text-lg border border-white/20 shadow-lg inline-block">
								{matches.length} {matches.length === 1 ? 'мач' : 'мача'}
							</span>
						</div>

						<div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
							{matches.map((match) => (
								<MatchCard key={match.id} match={match} onOpen={() => { setSelectedMatch(match); fetchCompleteMatchData(match); }} />
							))}
						</div>

						<div className="mt-12 backdrop-blur-xl bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-3xl p-6 sm:p-8 border-2 border-purple-500/40 shadow-2xl">
							<h3 className="font-black text-yellow-300 mb-3 text-xl sm:text-2xl md:text-3xl flex items-center gap-3">
								<Zap size={24} />
								Multi-Endpoint анализ
							</h3>
							<p className="text-slate-300 text-sm sm:text-base">
								При клик върху мач се зареждат паралелно: Fixture, Live Statistics, Events, Lineups, Player Stats, Head-to-Head, Predictions, Odds, Team Stats, Injuries, Form, Standings.
							</p>
						</div>
					</>
				)}
			</main>

			<Footer />
		</div>
	);
}

function TabButton({ icon, label, active, onClick }: any) {
	return (
		<button
			onClick={onClick}
			aria-pressed={active}
			className={`group px-3 sm:px-4 md:px-5 py-2 rounded-xl font-bold text-xs sm:text-sm md:text-base transition-all ${active
				? "bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 shadow-2xl shadow-emerald-500/30"
				: "backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-emerald-400/50"
				} flex items-center gap-1.5 sm:gap-2`}
		>
			{icon}
			<span>{label}</span>
		</button>
	);
}

function MatchCard({ match, onOpen }: any) {
	return (
		<div
			onClick={onOpen}
			className="group backdrop-blur-xl bg-white/5 rounded-3xl p-4 sm:p-5 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all border border-white/10 hover:border-emerald-400/50 relative overflow-hidden cursor-pointer"
		>
			<div className="absolute inset-0 bg-gradient-to-r from-emerald-600/0 via-green-600/0 to-teal-600/0 group-hover:from-emerald-600/10 group-hover:via-green-600/10 group-hover:to-teal-600/10 transition-all duration-500" />
			<div className="relative flex items-center justify-between mb-4">
				<span className="text-xs font-bold flex items-center gap-2 text-slate-300 group-hover:text-emerald-400">
					{match.leagueFlag && <img src={match.leagueFlag} className="w-5 h-4 rounded shadow-md" alt="league" />}
					<span className="hidden sm:inline">{match.league}</span>
				</span>
				{match.isLive && (
					<span className="bg-gradient-to-r from-red-500 to-rose-600 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-black animate-pulse shadow-lg shadow-red-500/40 flex items-center gap-1.5">
						<Flame size={12} />
						LIVE
					</span>
				)}
			</div>

			<div className="relative flex items-center justify-between gap-3 sm:gap-4">
				<TeamMini name={match.home} logo={match.homeLogo} align="left" />
				<div className="px-2 sm:px-4 text-center min-w-[80px] sm:min-w-[96px]">
					{match.isLive ? (
						<>
							<div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-br from-white via-emerald-200 to-green-300 bg-clip-text text-transparent">
								{match.homeScore} : {match.awayScore}
							</div>
							<div className="text-[10px] sm:text-[11px] text-emerald-400 font-bold mt-1 flex items-center justify-center gap-1">
								<Activity size={10} className="animate-pulse" />
								{match.time}
							</div>
						</>
					) : (
						<>
							<div className="text-[11px] sm:text-[12px] text-slate-400 mb-0.5">{match.date}</div>
							<div className="text-lg sm:text-xl font-black">{match.time}</div>
						</>
					)}
				</div>
				<TeamMini name={match.away} logo={match.awayLogo} align="right" />
			</div>

			<div className="relative mt-4 flex justify-between items-center text-xs">
				<span className="text-slate-500 group-hover:text-slate-300 transition-colors line-clamp-1 text-[10px] sm:text-xs">{match.venue}</span>
				<div className="flex items-center gap-1 text-emerald-400 font-bold group-hover:text-emerald-300 text-[10px] sm:text-xs">
					<span className="hidden sm:inline">Анализ</span>
					<ChevronRight className="group-hover:translate-x-1 transition-transform" size={14} />
				</div>
			</div>
		</div>
	);
}

function TeamMini({ name, logo, align = "left" }: any) {
	return (
		<div className={`flex items-center gap-2 sm:gap-3 ${align === "right" ? "justify-end flex-row-reverse" : ""} flex-1 min-w-0`}>
			{logo && <LogoGlow src={logo} />}
			<div className={`text-xs sm:text-sm md:text-base font-extrabold ${align === "right" ? "text-right" : ""} truncate`}>{name}</div>
		</div>
	);
}

function LogoGlow({ src }: any) {
	return (
		<div className="relative flex-shrink-0">
			<div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full group-hover:bg-emerald-500/50 transition-all" />
			<img src={src} className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 drop-shadow-xl group-hover:scale-110 transition-transform" alt="" />
		</div>
	);
}

function TeamBlock({ name, logo, bigScore, side }: any) {
	return (
		<div className="text-center flex-1">
			{logo && (
				<div className="relative inline-block mb-3">
					<div className="absolute inset-0 bg-white/20 blur-2xl rounded-full" />
					<img src={logo} className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto drop-shadow-2xl" alt={`${name} logo`} />
				</div>
			)}
			<div className="text-xl sm:text-2xl md:text-3xl font-black">{name}</div>
			{typeof bigScore === "number" && (
				<div className={`text-4xl sm:text-5xl md:text-6xl font-black mt-3 bg-gradient-to-br ${side === "home" ? "from-white to-emerald-200" : "from-white to-rose-200"} bg-clip-text text-transparent drop-shadow-2xl`}>
					{bigScore}
				</div>
			)}
		</div>
	);
}

function CenterBlock({ isLive, date, time }: any) {
	return (
		<div className="px-4 sm:px-6 text-center">
			{isLive ? (
				<>
					<div className="text-3xl sm:text-4xl md:text-5xl font-black text-white drop-shadow-lg">VS</div>
					<div className="bg-gradient-to-r from-red-500 to-rose-500 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl animate-pulse font-black mt-3 shadow-2xl border border-red-400/50 inline-flex items-center gap-2 text-sm sm:text-base">
						<Flame size={16} />
						{time}
					</div>
				</>
			) : (
				<div className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 sm:p-5 border border-white/20 shadow-xl">
					<Calendar className="mx-auto mb-2 text-yellow-400" size={32} />
					<div className="text-xs text-emerald-100 mb-1">{date}</div>
					<div className="text-xl sm:text-2xl font-black">{time}</div>
				</div>
			)}
		</div>
	);
}

function Section({ title, icon, children }: any) {
	return (
		<section className="backdrop-blur-xl bg-white/5 rounded-3xl p-4 sm:p-6 md:p-8 mb-8 shadow-2xl border border-white/10">
			<h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-4 sm:mb-6 flex items-center gap-3 bg-gradient-to-r from-emerald-300 to-green-300 bg-clip-text text-transparent">
				{icon}
				{title}
			</h2>
			{children}
		</section>
	);
}

function SectionGradient({ title, icon, children, gradient, border }: any) {
	return (
		<section className={`relative backdrop-blur-xl bg-gradient-to-br ${gradient} rounded-3xl p-4 sm:p-6 md:p-8 mb-8 shadow-2xl border ${border} overflow-hidden`}>
			<div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(50%_50%_at_50%_0%,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_60%)]" />
			<h2 className="relative text-xl sm:text-2xl md:text-3xl font-black mb-4 sm:mb-6 flex items-center gap-3 text-white">
				{icon}
				{title}
			</h2>
			<div className="relative">{children}</div>
		</section>
	);
}

function EventRow({ evt }: any) {
	const mood =
		evt.type === "Goal"
			? "from-green-900/60 to-emerald-900/60 border-green-400"
			: evt.detail === "Yellow Card"
				? "from-yellow-900/40 to-amber-900/40 border-yellow-400"
				: evt.detail === "Red Card"
					? "from-red-900/60 to-rose-900/60 border-red-400"
					: "from-slate-800/40 to-slate-800/20 border-white/10";

	return (
		<div className={`p-3 md:p-4 rounded-2xl bg-gradient-to-r ${mood} border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0`}>
			<div className="flex items-center gap-3">
				<span className="font-black text-emerald-400 text-base md:text-lg min-w-[48px]">{evt.time}</span>
				<div className="min-w-0">
					<div className="font-bold text-sm md:text-base truncate">{evt.player}</div>
					{evt.assist && <div className="text-xs text-slate-300">(асист: {evt.assist})</div>}
				</div>
			</div>
			<div className="text-left sm:text-right">
				<div className="text-[11px] text-slate-400 mb-0.5">{evt.team}</div>
				<div className="font-bold text-sm">{evt.detail}</div>
			</div>
		</div>
	);
}

function TopPlayers({ title, color, players }: any) {
	const ring = color === "emerald" ? "border-emerald-400" : "border-rose-400";
	const accent = color === "emerald" ? "text-emerald-400" : "text-rose-400";
	const hoverBorder = color === "emerald" ? "hover:border-emerald-400/50" : "hover:border-rose-400/50";

	return (
		<div>
			<h3 className={`font-black text-lg sm:text-xl mb-4 flex items-center gap-2 ${accent}`}>
				<Star size={20} className={color === "emerald" ? "fill-emerald-400" : "fill-rose-400"} />
				{title}
			</h3>
			{players && players.map((p: any, idx: number) => (
				<div key={idx} className={`backdrop-blur-sm bg-white/5 rounded-2xl p-3 sm:p-4 mb-3 flex items-center gap-3 sm:gap-4 hover:bg-white/10 transition-all border border-white/10 ${hoverBorder} hover:scale-[1.01]`}>
					{p.photo && <img src={p.photo} className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 ${ring} shadow-lg flex-shrink-0`} alt={p.name} />}
					<div className="flex-1 min-w-0">
						<div className="font-bold text-sm sm:text-base truncate">{p.name}</div>
						<div className="text-[10px] sm:text-[11px] text-slate-300 flex gap-1.5 sm:gap-2 flex-wrap mt-1">
							{p.goals > 0 && <span className="bg-green-500/20 px-1.5 sm:px-2 py-0.5 rounded-lg">⚽ {p.goals}</span>}
							{p.assists > 0 && <span className="bg-blue-500/20 px-1.5 sm:px-2 py-0.5 rounded-lg">🎯 {p.assists}</span>}
							<span className="bg-slate-700/40 px-1.5 sm:px-2 py-0.5 rounded-lg">{p.shots} удара</span>
							<span className="bg-slate-700/40 px-1.5 sm:px-2 py-0.5 rounded-lg">{p.passAccuracy}% пас</span>
						</div>
					</div>
					<div className="bg-gradient-to-br from-yellow-400 to-amber-500 text-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl font-black text-base sm:text-lg shadow-lg flex-shrink-0">
						{p.rating || "N/A"}
					</div>
				</div>
			))}
		</div>
	);
}

function LineupCard({ side, team, data }: any) {
	const accent = side === "home" ? "text-emerald-400" : "text-rose-400";
	const panel =
		side === "home"
			? "bg-gradient-to-br from-emerald-900/20 to-green-900/20 border-emerald-500/30"
			: "bg-gradient-to-br from-rose-900/20 to-red-900/20 border-rose-500/30";

	return (
		<div className={`backdrop-blur-sm ${panel} rounded-2xl p-4 sm:p-6 border`}>
			<div className="text-center mb-5">
				<div className={`font-black text-lg sm:text-xl ${accent} mb-1`}>{team}</div>
				<div className={`text-xs sm:text-sm ${side === "home" ? "text-emerald-200" : "text-rose-200"} mb-0.5`}>{data.formation}</div>
				<div className="text-[10px] sm:text-xs text-slate-400">Треньор: {data.coach}</div>
			</div>
			<div className="mb-4">
				<div className={`text-xs sm:text-sm font-bold ${side === "home" ? "text-emerald-300" : "text-rose-300"} mb-2 flex items-center gap-2`}>
					<Target size={14} />
					Основен състав
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{data.startXI && data.startXI.map((p: any, idx: number) => (
						<div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-2 sm:p-3 flex items-center gap-2 sm:gap-3 border border-white/10">
							<div className={`rounded-full w-8 h-8 sm:w-9 sm:h-9 grid place-items-center font-black text-xs sm:text-sm shadow ${side === "home" ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-rose-500 to-red-600"}`}>
								{p.number}
							</div>
							<div className="flex-1 min-w-0">
								<div className="font-bold text-xs sm:text-sm truncate">{p.name}</div>
								<div className={`text-[10px] sm:text-xs ${side === "home" ? "text-emerald-300" : "text-rose-300"}`}>{p.pos}</div>
							</div>
						</div>
					))}
				</div>
			</div>
			<div>
				<div className={`text-xs sm:text-sm font-bold ${side === "home" ? "text-emerald-300" : "text-rose-300"} mb-2`}>Резерви</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{data.substitutes && data.substitutes.slice(0, 8).map((p: any, idx: number) => (
						<div key={idx} className="bg-white/5 backdrop-blur-sm rounded-xl p-2 text-[10px] sm:text-xs border border-white/10 truncate">
							<span className={`${side === "home" ? "text-emerald-400" : "text-rose-400"} font-bold`}>{p.number}</span>{" "}
							{p.name} <span className="text-slate-400">({p.pos})</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function H2HSummary({ d, m }: any) {
	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
			<KPI value={d.h2h.summary.homeWins} label={m.home} tone="emerald" />
			<KPI value={d.h2h.summary.draws} label="Равни" tone="neutral" />
			<KPI value={d.h2h.summary.awayWins} label={m.away} tone="rose" />
			<KPI value={d.h2h.summary.avgGoals} label="Средно голове" tone="green" />
		</div>
	);
}

function KPI({ value, label, tone }: any) {
	const map: any = {
		emerald: "from-emerald-900/30 to-green-900/30 border-emerald-500/30 text-emerald-400",
		rose: "from-rose-900/30 to-red-900/30 border-rose-500/30 text-rose-400",
		green: "from-green-900/30 to-emerald-900/30 border-green-500/30 text-green-400",
		neutral: "from-white/10 to-white/10 border-white/20",
	};
	const styling = map[tone] || map.neutral;
	return (
		<div className={`backdrop-blur-sm bg-gradient-to-br rounded-2xl p-4 sm:p-5 text-center border hover:scale-[1.02] transition-transform ${styling}`}>
			<div className="text-3xl sm:text-4xl font-black mb-1">{value}</div>
			<div className="text-[10px] sm:text-xs text-slate-300 truncate">{label}</div>
		</div>
	);
}

function PredictionsGrid({ d, m }: any) {
	return (
		<>
			<div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
				<PredBox label={m.home} value={d.predictions.percentages?.home} tone="emerald" />
				<PredBox label="Равенство" value={d.predictions.percentages?.draw} tone="neutral" />
				<PredBox label={m.away} value={d.predictions.percentages?.away} tone="rose" />
			</div>
			{d.predictions.winner && (
				<div className="backdrop-blur-sm bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border-2 border-yellow-500/70 rounded-2xl p-4 sm:p-5 mb-4">
					<div className="font-black text-lg sm:text-xl text-yellow-300 mb-1 flex items-center gap-2">
						<Trophy className="text-yellow-400" size={18} />
						Фаворит: {d.predictions.winner.name}
					</div>
					<div className="text-xs sm:text-sm text-yellow-100">{d.predictions.winner.comment}</div>
				</div>
			)}
			<div className="grid md:grid-cols-2 gap-4">
				<InfoBox label="Препоръка" value={d.predictions.advice} />
				<InfoBox label="Над/Под" value={d.predictions.underOver} />
			</div>
		</>
	);
}

function PredBox({ label, value, tone }: any) {
	const map: any = {
		emerald: "border-emerald-500/50 text-emerald-400",
		rose: "border-rose-500/50 text-rose-400",
		neutral: "border-white/50 text-white",
	};
	const style = map[tone] || map.neutral;
	return (
		<div className={`backdrop-blur-xl bg-white/10 rounded-2xl p-4 sm:p-6 text-center border ${style} hover:scale-[1.02] transition-transform shadow-xl`}>
			<div className="text-xs sm:text-sm opacity-90 mb-2">{label}</div>
			<div className="text-3xl sm:text-4xl font-black drop-shadow-lg">{value || "-"}</div>
		</div>
	);
}

function InfoBox({ label, value }: any) {
	return (
		<div className="backdrop-blur-sm bg-white/10 rounded-2xl p-4 sm:p-5 border border-white/20">
			<div className="text-xs sm:text-sm text-slate-300 mb-1">{label}</div>
			<div className="font-bold text-white text-sm sm:text-base">{value || "-"}</div>
		</div>
	);
}

function OddsGrid({ d, m }: any) {
	return (
		<>
			{d.odds.odds?.matchWinner && (
				<div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
					<OddBox label={`1`} sublabel={m.home} value={d.odds.odds.matchWinner.home} tone="emerald" />
					<OddBox label="X" sublabel="Равен" value={d.odds.odds.matchWinner.draw} tone="neutral" />
					<OddBox label="2" sublabel={m.away} value={d.odds.odds.matchWinner.away} tone="rose" />
				</div>
			)}
			{d.odds.odds?.overUnder && (
				<div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
					<OddBox label="Над 2.5" value={d.odds.odds.overUnder.over25} tone="yellow" />
					<OddBox label="Под 2.5" value={d.odds.odds.overUnder.under25} tone="yellow" />
				</div>
			)}
			{d.odds.odds?.btts && (
				<div className="grid grid-cols-2 gap-3 sm:gap-4">
					<OddBox label="BTTS Да" value={d.odds.odds.btts.yes} tone="green" />
					<OddBox label="BTTS Не" value={d.odds.odds.btts.no} tone="slate" />
				</div>
			)}
		</>
	);
}

function OddBox({ label, sublabel, value, tone }: any) {
	const map: any = {
		emerald: "border-emerald-500 text-emerald-300",
		rose: "border-rose-500 text-rose-300",
		yellow: "border-yellow-500 text-yellow-300",
		green: "border-green-500 text-green-300",
		slate: "border-slate-500 text-slate-200",
		neutral: "border-white/50 text-white",
	};
	const style = map[tone] || map.neutral;
	return (
		<div className={`backdrop-blur-xl bg-white/10 rounded-2xl p-4 sm:p-6 text-center border-2 ${style} hover:scale-[1.02] transition-transform shadow-xl`}>
			<div className="text-xs mb-1 opacity-90">{label}</div>
			{sublabel && <div className="text-[10px] mb-2 opacity-75 truncate">{sublabel}</div>}
			<div className="text-2xl sm:text-3xl font-black drop-shadow-lg">{value || "-"}</div>
		</div>
	);
}

function TeamStatsCard({ teamName, stats, accent }: any) {
	const tonePanel =
		accent === "emerald"
			? "from-emerald-900/20 to-green-900/20 border-emerald-500/30 text-emerald-400"
			: "from-rose-900/20 to-red-900/20 border-rose-500/30 text-rose-400";

	return (
		<div className={`backdrop-blur-xl bg-gradient-to-br ${tonePanel.split(" text-")[0]} rounded-3xl p-4 sm:p-6 border-2 ${tonePanel.split(" ")[3]} shadow-2xl`}>
			<h3 className={`text-xl sm:text-2xl font-black mb-4 ${accent === "emerald" ? "text-emerald-400" : "text-rose-400"} flex items-center gap-2`}>
				<BarChart3 size={20} />
				{teamName}
			</h3>
			<div className="space-y-4">
				<div className="backdrop-blur-sm bg-white/10 rounded-2xl p-4 border border-white/20">
					<div className="text-xs opacity-80 mb-1">Форма</div>
					<div className="font-black text-lg sm:text-xl">{stats.form}</div>
				</div>
				<div className="grid grid-cols-3 gap-2 sm:gap-3">
					<KpiMini label="Победи" value={stats.fixtures?.wins?.total ?? 0} tone="green" />
					<KpiMini label="Равни" value={stats.fixtures?.draws?.total ?? 0} tone="neutral" />
					<KpiMini label="Загуби" value={stats.fixtures?.loses?.total ?? 0} tone="red" />
				</div>
				<div className="backdrop-blur-sm bg-white/10 rounded-2xl p-4 border border-white/20">
					<div className="text-xs opacity-80 mb-2">Средно голове</div>
					<div className="flex justify-between font-semibold text-sm sm:text-base">
						<span className="text-green-400">За: {stats.goals?.for?.average?.total ?? 0}</span>
						<span className="text-red-400">Против: {stats.goals?.against?.average?.total ?? 0}</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function KpiMini({ label, value, tone }: any) {
	const map: any = {
		green: "from-green-900/40 to-emerald-900/40 border-green-500/30 text-green-400",
		red: "from-red-900/40 to-rose-900/40 border-red-500/30 text-red-400",
		neutral: "from-white/10 to-white/10 border-white/20 text-white",
	};
	const style = map[tone] || map.neutral;
	return (
		<div className={`backdrop-blur-sm bg-gradient-to-br rounded-2xl p-3 sm:p-4 text-center border ${style}`}>
			<div className="text-xl sm:text-2xl font-black mb-0.5">{value}</div>
			<div className="text-[10px] sm:text-[11px] opacity-80">{label}</div>
		</div>
	);
}

function InjuriesList({ title, color, injuries }: any) {
	const accent = color === "emerald" ? "text-emerald-400 border-emerald-400" : "text-rose-400 border-rose-400";
	return (
		<div>
			<h3 className={`font-black text-lg sm:text-xl mb-3 ${accent.split(" ")[0]}`}>{title}</h3>
			{injuries.map((inj: any, idx: number) => (
				<div key={idx} className="backdrop-blur-sm bg-white/5 rounded-2xl p-3 sm:p-4 mb-2 flex items-center gap-3 sm:gap-4 border border-red-500/30">
					{inj.photo && <img src={inj.photo} className="w-10 h-10 rounded-full border-2 border-red-400 shadow flex-shrink-0" alt={inj.player} />}
					<div className="min-w-0">
						<div className="font-bold text-sm sm:text-base truncate">{inj.player}</div>
						<div className="text-xs text-red-300 mt-0.5 line-clamp-1">{inj.reason}</div>
					</div>
				</div>
			))}
		</div>
	);
}

function StandingCard({ color, teamName, standing }: any) {
	const tone =
		color === "emerald"
			? "from-emerald-900/30 to-green-900/30 border-emerald-500/50 text-emerald-400"
			: "from-rose-900/30 to-red-900/30 border-rose-500/50 text-rose-400";

	if (!standing) {
		return (
			<div className={`backdrop-blur-sm bg-gradient-to-br rounded-2xl p-4 sm:p-6 border ${tone}`}>
				<div className={`font-black text-lg sm:text-xl mb-2 ${color === "emerald" ? "text-emerald-400" : "text-rose-400"}`}>{teamName}</div>
				<div className="text-2xl font-black mb-1 text-slate-400">Няма данни</div>
				<div className="text-xs text-slate-500">Класирането не е налично</div>
			</div>
		);
	}

	return (
		<div className={`backdrop-blur-sm bg-gradient-to-br rounded-2xl p-4 sm:p-6 border ${tone}`}>
			<div className={`font-black text-lg sm:text-xl mb-2 ${color === "emerald" ? "text-emerald-400" : "text-rose-400"}`}>{teamName}</div>
			<div className="text-4xl sm:text-5xl font-black mb-1">#{standing.rank || "N/A"}</div>
			<div className="text-xs sm:text-sm text-slate-300">
				{standing.points} т. • {standing.all?.win || 0}П-{standing.all?.draw || 0}Р-{standing.all?.lose || 0}З
			</div>
		</div>
	);
}

function LoadingGrid() {
	return (
		<div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
			{Array.from({ length: 6 }).map((_, i) => (
				<div key={i} className="rounded-3xl p-4 sm:p-5 border border-white/10 bg-white/5 animate-pulse space-y-4">
					<div className="h-4 w-1/3 bg-white/10 rounded" />
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-full flex-shrink-0" />
							<div className="h-4 w-20 sm:w-24 bg-white/10 rounded" />
						</div>
						<div className="h-8 w-16 sm:w-20 bg-white/10 rounded" />
						<div className="flex items-center gap-3">
							<div className="h-4 w-20 sm:w-24 bg-white/10 rounded" />
							<div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-full flex-shrink-0" />
						</div>
					</div>
					<div className="h-3 w-full bg-white/10 rounded" />
				</div>
			))}
		</div>
	);
}

function AIAnalysisSection({ match, details, aiAnalysis }: any) {
	return (
		<SectionGradient title="🤖 AI Анализ & Betting Препоръки" icon={<Brain className="text-emerald-300" size={28} />} gradient="from-emerald-900/40 to-green-900/40" border="border-emerald-500/50">
			<div className="grid lg:grid-cols-2 gap-6 mb-6">
				<div className="backdrop-blur-sm bg-emerald-900/20 rounded-2xl p-4 sm:p-6 border border-emerald-500/30">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 grid place-items-center shadow-lg">
							<Shield size={24} className="text-white" />
						</div>
						<div>
							<div className="font-black text-lg text-emerald-400">{match.home}</div>
							<div className="text-xs text-slate-400">Домакински анализ</div>
						</div>
					</div>
					{aiAnalysis.homeAnalysis.length > 0 ? (
						<ul className="space-y-2">
							{aiAnalysis.homeAnalysis.map((item: string, idx: number) => (
								<li key={idx} className="text-sm text-slate-200 flex items-start gap-2">
									<ChevronRight size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
									<span>{item}</span>
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-slate-400 italic">Недостатъчно данни за анализ</p>
					)}
				</div>

				<div className="backdrop-blur-sm bg-rose-900/20 rounded-2xl p-4 sm:p-6 border border-rose-500/30">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-red-600 grid place-items-center shadow-lg">
							<Shield size={24} className="text-white" />
						</div>
						<div>
							<div className="font-black text-lg text-rose-400">{match.away}</div>
							<div className="text-xs text-slate-400">Гостуващ анализ</div>
						</div>
					</div>
					{aiAnalysis.awayAnalysis.length > 0 ? (
						<ul className="space-y-2">
							{aiAnalysis.awayAnalysis.map((item: string, idx: number) => (
								<li key={idx} className="text-sm text-slate-200 flex items-start gap-2">
									<ChevronRight size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
									<span>{item}</span>
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-slate-400 italic">Недостатъчно данни за анализ</p>
					)}
				</div>
			</div>

			<div className="backdrop-blur-sm bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border-2 border-yellow-500/70 rounded-2xl p-4 sm:p-6 mb-6">
				<div className="flex items-center gap-3 mb-4">
					<Trophy className="text-yellow-400" size={32} />
					<div>
						<div className="font-black text-xl sm:text-2xl text-yellow-300">{aiAnalysis.prediction}</div>
						<div className="text-sm text-yellow-100">Увереност: {aiAnalysis.confidence}%</div>
					</div>
				</div>
				<div className="bg-yellow-900/30 rounded-xl p-1 h-3 mb-2">
					<div
						className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full rounded-lg transition-all duration-1000"
						style={{ width: `${aiAnalysis.confidence}%` }}
					/>
				</div>
			</div>

			<div>
				<h3 className="font-black text-xl mb-4 flex items-center gap-2 text-yellow-300">
					<Target size={24} />
					Препоръчани залози
				</h3>
				{aiAnalysis.bettingTips.length > 0 ? (
					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{aiAnalysis.bettingTips.map((tip: any, idx: number) => (
							<div key={idx} className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20 hover:border-yellow-400/50 transition-all hover:scale-[1.02]">
								<div className="text-3xl mb-2">{tip.icon}</div>
								<div className="font-bold text-white mb-1">{tip.tip}</div>
								<div className="text-xs text-slate-300 mb-2">{tip.reason}</div>
								<div className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${
									tip.confidence === "висока" ? "bg-green-500/20 text-green-300" :
									tip.confidence === "средна" ? "bg-yellow-500/20 text-yellow-300" :
									"bg-orange-500/20 text-orange-300"
								}`}>
									{tip.confidence} увереност
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-slate-400 italic">Няма достатъчно данни за betting препоръки</p>
				)}
			</div>
		</SectionGradient>
	);
}

function FormCard({ team, form, stats, color }: any) {
	const accent = color === "emerald" ? "text-emerald-400 border-emerald-400" : "text-rose-400 border-rose-400";
	const bgGrad = color === "emerald" ? "from-emerald-900/20 to-green-900/20" : "from-rose-900/20 to-red-900/20";

	const getResultColor = (result: string) => {
		if (result === "W") return "bg-green-500 text-white";
		if (result === "L") return "bg-red-500 text-white";
		return "bg-slate-500 text-white";
	};

	const getResultIcon = (result: string) => {
		if (result === "W") return "✓";
		if (result === "L") return "✗";
		return "=";
	};

	const formString = form.form || "";
	const wins = stats?.fixtures?.wins?.total || 0;
	const draws = stats?.fixtures?.draws?.total || 0;
	const losses = stats?.fixtures?.loses?.total || 0;

	return (
		<div className={`backdrop-blur-sm bg-gradient-to-br ${bgGrad} rounded-2xl p-4 sm:p-6 border ${accent.split(" ")[1]}/30`}>
			<h3 className={`font-black text-lg sm:text-xl mb-4 ${accent.split(" ")[0]}`}>{team}</h3>

			{formString && (
				<div className="flex items-center gap-2 mb-4">
					<span className="text-sm text-slate-400">Форма:</span>
					<div className="flex gap-1">
						{formString.split("").map((result: string, idx: number) => (
							<div key={idx} className={`w-8 h-8 rounded-lg ${getResultColor(result)} grid place-items-center font-black text-sm shadow-lg`}>
								{getResultIcon(result)}
							</div>
						))}
					</div>
				</div>
			)}

			<div className="grid grid-cols-3 gap-3 mb-4">
				<div className="backdrop-blur-sm bg-green-900/30 rounded-xl p-3 text-center border border-green-500/30">
					<div className="text-2xl font-black text-green-400">{wins}</div>
					<div className="text-xs text-slate-300">Победи</div>
				</div>
				<div className="backdrop-blur-sm bg-slate-700/30 rounded-xl p-3 text-center border border-slate-500/30">
					<div className="text-2xl font-black text-slate-300">{draws}</div>
					<div className="text-xs text-slate-300">Равни</div>
				</div>
				<div className="backdrop-blur-sm bg-red-900/30 rounded-xl p-3 text-center border border-red-500/30">
					<div className="text-2xl font-black text-red-400">{losses}</div>
					<div className="text-xs text-slate-300">Загуби</div>
				</div>
			</div>

			{stats && (
				<div className="backdrop-blur-sm bg-white/5 rounded-xl p-4 border border-white/10">
					<div className="text-sm text-slate-400 mb-2">Средно голове</div>
					<div className="flex justify-between">
						<span className="text-green-400 font-bold">За: {stats.goals?.for?.average?.total || 0}</span>
						<span className="text-red-400 font-bold">Против: {stats.goals?.against?.average?.total || 0}</span>
					</div>
				</div>
			)}

			{form.last5 && form.last5.length > 0 && (
				<div className="mt-4 space-y-2">
					{form.last5.map((match: any, idx: number) => (
						<div key={idx} className="backdrop-blur-sm bg-white/5 rounded-xl p-3 border border-white/10 hover:bg-white/10 transition-all">
							<div className="flex justify-between items-center mb-1">
								<span className="text-xs text-slate-400">{match.date}</span>
								<div className={`w-6 h-6 rounded ${getResultColor(match.result)} grid place-items-center text-xs font-bold`}>
									{getResultIcon(match.result)}
								</div>
							</div>
							<div className="font-bold text-sm truncate">{match.opponent}</div>
							<div className="text-xs text-slate-300">{match.score}</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function Footer() {
	return (
		<footer className="mt-10 py-6 sm:py-8 border-t border-white/10 text-center text-xs sm:text-sm text-slate-400">
			<div className="mx-auto max-w-7xl px-4">
				<div className="opacity-90">© {new Date().getFullYear()} PitchPulse • Реално време • Дълбоки статистики</div>
			</div>
		</footer>
	);
}
