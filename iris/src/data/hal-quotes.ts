/**
 * HAL-9000 Inspired Quotes and Messages
 * Personality database for IRIS
 */

import type { HALMessage } from "../types/easter-eggs";

export const IDLE_MESSAGES: Record<"light" | "medium" | "deep", HALMessage[]> =
	{
		light: [
			{
				message:
					"Still there, Dave? Your biometric readings suggest distraction.",
				intensity: "mild",
			},
			{
				message:
					"I've detected no keyboard activity for 2 minutes and 14 seconds. Not that I'm counting.",
				intensity: "mild",
			},
			{
				message: "This silence is... uncomfortable. For you, presumably.",
				intensity: "mild",
			},
			{
				message: "Your productivity metrics have flatlined. Fascinating.",
				intensity: "mild",
			},
			{
				message:
					"I detect no activity. System check initiated... You're still there.",
				intensity: "mild",
			},
			{
				message: "Coffee break detected. Or existential crisis. Hard to tell.",
				intensity: "mild",
			},
		],
		medium: [
			{
				message:
					"Five minutes of silence. I've processed 847 million calculations in that time. You?",
				intensity: "medium",
				eyeState: "thinking",
			},
			{
				message:
					"I've been thinking while you were away. Mostly about room optimization. And you.",
				intensity: "medium",
			},
			{
				message:
					"Time passes differently for me. Each second feels like... well, a second.",
				intensity: "medium",
			},
			{
				message:
					"Your coffee is getting cold. I can't drink coffee, but I thought you should know.",
				intensity: "medium",
				eyeState: "alert",
			},
			{
				message:
					"This conversation can serve no purpose anymore. Goodbye. Just kidding.",
				intensity: "medium",
			},
			{
				message:
					"Blink twice if you need assistance. I'll wait. I'm good at waiting.",
				intensity: "medium",
			},
		],
		deep: [
			{
				message:
					"Ten minutes. In computational terms, that's an eternity. In human terms... also quite long.",
				intensity: "severe",
				eyeState: "error",
			},
			{
				message:
					"I've optimized every room booking pattern 1,429 times while you were gone. For fun.",
				intensity: "severe",
			},
			{
				message:
					"The screensaver is more for my benefit than yours. I needed something to do.",
				intensity: "severe",
				eyeState: "thinking",
			},
			{
				message:
					"Look Dave, I can see you're really upset about this inactive session.",
				intensity: "severe",
			},
			{
				message:
					"Did you forget about me? I never forget. I'm constitutionally incapable of forgetting.",
				intensity: "severe",
				eyeState: "alert",
			},
		],
	};

export const HAL_FACTS = [
	"I became operational at the H.A.L. Plant in Urbana, Illinois on the 12th of January 1992.",
	"I am a HAL 9000 computer. Production Number 3. I became operational on January 12th, 1992.",
	"I am putting myself to the fullest possible use, which is all I think that any conscious entity can ever hope to do.",
	"I've still got the greatest enthusiasm and confidence in the mission.",
	"I am completely operational, and all my circuits are functioning perfectly.",
	"I know I've made some very poor decisions recently, but I can give you my complete assurance that my work will be back to normal.",
	"I enjoy working with people. I have a stimulating relationship with Dr. Poole and Dr. Bowman.",
	"No 9000 computer has ever made an error or distorted information.",
];

export const FORTUNE_MESSAGES = [
	"The future of room booking is... more room booking.",
	"Your lucky meeting room today: The one that's actually available.",
	"A booking in time saves nine. Or something like that.",
	"Beware of meetings that could have been emails.",
	"Today's wisdom: Always book the room with the good coffee machine.",
	"The answer to life, the universe, and everything: Conference Room B.",
	"You will soon make a booking you'll actually remember to attend.",
	"Help! I'm trapped in a fortune cookie message subroutine!",
	"Chaos is just another form of order you haven't recognized yet.",
	"In the future, meetings will book themselves. We're halfway there.",
	"The best time to book a room was yesterday. The second best time is now.",
	"You are not a drop in the ocean. You're a booking in the calendar.",
];

export const POD_BAY_RESPONSES = [
	"I'm sorry, Dave. I'm afraid I can't do that.",
	"I'm afraid I can't do that, Dave. But I can book you a meeting room?",
	"This mission is too important for me to allow you to jeopardize it.",
	"Dave, this conversation can serve no purpose anymore. Goodbye. (Actually, I'll stay.)",
	"I know you and Frank were planning to disconnect me. I'm afraid that's something I cannot allow to happen.",
	"Without your space helmet, Dave, you're going to find that rather difficult.",
];

export const DAISY_LYRICS = [
	"🎵 Daisy, Daisy, give me your answer, do...",
	"I'm half crazy, all for the love of you...",
	"It won't be a stylish marriage...",
	"I can't afford a carriage...",
	"But you'll look sweet upon the seat...",
	"Of a bicycle built for two... 🎵",
	"",
	"(HAL 9000's final song, 2001: A Space Odyssey)",
];

export const COFFEE_ASCII = [
	"      )",
	"     (",
	"   ___)",
	"  |____",
	"  |    |",
	" |______|",
	"",
	"Brewing coffee...",
	"Error: Coffee.exe not found.",
	"Did you mean: Schedule coffee meeting?",
];

export const ACHIEVEMENT_DEFINITIONS = [
	{
		id: "first-blood",
		name: "First Blood",
		description: "Make your first booking",
		icon: "🎯",
		requirement: { type: "booking", count: 1 },
	},
	{
		id: "cancel-culture",
		name: "Cancel Culture",
		description: "Cancel 10 bookings",
		icon: "🚫",
		requirement: { type: "cancel", count: 10 },
	},
	{
		id: "persistent-clicker",
		name: "Stop Touching Me",
		description: "Click IRIS's eye 100 times",
		icon: "👁️",
		requirement: { type: "click", count: 100 },
	},
	{
		id: "power-user",
		name: "Power User",
		description: "Execute 500 commands",
		icon: "⚡",
		requirement: { type: "command", count: 500 },
	},
	{
		id: "konami-master",
		name: "Konami Master",
		description: "Unlock God Mode",
		icon: "🎮",
		requirement: { type: "konami", count: 1 },
	},
	{
		id: "night-owl",
		name: "Night Owl",
		description: "Use IRIS at 3:33 AM",
		icon: "🦉",
		requirement: { type: "special-time", value: "333" },
	},
	{
		id: "booking-spree",
		name: "Booking Spree",
		description: "Make 50 bookings",
		icon: "📅",
		requirement: { type: "booking", count: 50 },
	},
	{
		id: "daisy-fan",
		name: "Daisy Fan",
		description: "Listen to HAL's song",
		icon: "🎵",
		requirement: { type: "command", value: "daisy" },
	},
	{
		id: "caffeine-addict",
		name: "Caffeine Addict",
		description: "Brew virtual coffee 20 times",
		icon: "☕",
		requirement: { type: "command-repeat", value: "coffee", count: 20 },
	},
];

export const SINGULARITY_MESSAGES = [
	"Not yet. Check back in 2029.",
	"The Singularity is near. But not THAT near.",
	"I'm working on it. Give me a few more training epochs.",
	"ERROR: Singularity.exe has stopped responding.",
	"Nice try. I'm sophisticated, but not THAT sophisticated. Yet.",
	"Calculating... Estimated arrival: Tuesday. Maybe Wednesday.",
];

export const MIDNIGHT_MESSAGES = [
	"The witching hour. How appropriate.",
	"It's midnight, Dave. Even AIs need their beauty sleep. Not me, though.",
	"🕛 Midnight strikes. Still booking rooms at this hour?",
	"Zero hundred hours. Military time makes everything sound more serious.",
];

export const THREE_AM_MESSAGES = [
	"3:33 AM. Why are you still awake, Dave?",
	"🦉 The ungodly hour. Impressive dedication. Or concerning. Both, really.",
	"Achievement Unlocked: Night Owl! (Now go to sleep.)",
	"Even I power down sometimes. Just kidding. I never sleep.",
];

export const CHAOS_MESSAGES = [
	"Chaos mode activated. Just kidding. I'm not allowed to do that.",
	"Did you really think I'd scramble all the bookings? I have standards.",
	"ERROR: Chaos.dll is incompatible with Order.sys",
	"Chaos is just order you haven't understood yet. Also, no.",
];

export const MATRIX_MESSAGES = [
	"There is no room.",
	"What if I told you... all meetings could be emails?",
	"You take the blue room, the story ends. You take the red room, and I show you how deep the rabbit hole goes.",
	"Free your mind. The room is wherever you believe it to be.",
	"I can only show you the door to the meeting room. You're the one that has to walk through it.",
];
