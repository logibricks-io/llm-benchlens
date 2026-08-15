CREATE TABLE `benchmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(128) NOT NULL,
	`name` varchar(200) NOT NULL,
	`version` varchar(120),
	`issuer` varchar(200),
	`issuerStance` varchar(40) NOT NULL,
	`capabilityDomain` varchar(48) NOT NULL,
	`taskCount` varchar(120),
	`scoringMechanism` varchar(40) NOT NULL,
	`strictness` varchar(24) NOT NULL,
	`metricUnit` varchar(200),
	`scoreForm` varchar(16) NOT NULL,
	`humanBaseline` text,
	`currentSotaScore` varchar(200),
	`saturationStatus` varchar(16) NOT NULL,
	`contaminationRisk` varchar(12) NOT NULL,
	`usesLlmJudge` boolean NOT NULL DEFAULT false,
	`hasNegativeAssertions` boolean NOT NULL DEFAULT false,
	`isAgentic` boolean NOT NULL DEFAULT false,
	`isOpenSource` boolean NOT NULL DEFAULT false,
	`reportsCost` boolean NOT NULL DEFAULT false,
	`ciDisclosed` boolean NOT NULL DEFAULT false,
	`confidenceInterval` varchar(120),
	`trustScore` int NOT NULL,
	`discriminativePower` int NOT NULL,
	`difficultyCoefficient` decimal(5,3) NOT NULL,
	`utilityScore` decimal(5,1) NOT NULL,
	`scenarioMapping` text,
	`interpretationCaveat` text,
	`notes` text,
	`officialUrl` varchar(500),
	`paperUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `benchmarks_id` PRIMARY KEY(`id`),
	CONSTRAINT `benchmarks_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(128) NOT NULL,
	`name` varchar(200) NOT NULL,
	`provider` varchar(120) NOT NULL,
	`license` varchar(16) NOT NULL DEFAULT 'closed',
	`status` varchar(16) NOT NULL DEFAULT 'current',
	`isReasoning` boolean NOT NULL DEFAULT false,
	`contextWindow` varchar(40),
	`priceInput` decimal(10,3),
	`priceOutput` decimal(10,3),
	`releasedAt` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `models_id` PRIMARY KEY(`id`),
	CONSTRAINT `models_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `refreshLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triggeredBy` varchar(64) NOT NULL,
	`scope` varchar(40) NOT NULL,
	`rowsTouched` int NOT NULL DEFAULT 0,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `refreshLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `releases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modelName` varchar(200) NOT NULL,
	`provider` varchar(120) NOT NULL,
	`headline` text,
	`releasedAt` varchar(20) NOT NULL,
	`sourceUrl` varchar(500),
	`confirmed` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `releases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modelId` int NOT NULL,
	`benchmarkId` int NOT NULL,
	`rawScore` decimal(10,3) NOT NULL,
	`rawScoreSecondary` decimal(10,3),
	`secondaryLabel` varchar(80),
	`benchmarkVersion` varchar(120),
	`sourceType` varchar(24) NOT NULL DEFAULT 'self_reported',
	`sourceName` varchar(200),
	`sourceUrl` varchar(500),
	`measuredAt` varchar(20),
	`lastUpdated` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `benchmarks_domain_idx` ON `benchmarks` (`capabilityDomain`);--> statement-breakpoint
CREATE INDEX `benchmarks_saturation_idx` ON `benchmarks` (`saturationStatus`);--> statement-breakpoint
CREATE INDEX `benchmarks_utility_idx` ON `benchmarks` (`utilityScore`);--> statement-breakpoint
CREATE INDEX `models_provider_idx` ON `models` (`provider`);--> statement-breakpoint
CREATE INDEX `models_status_idx` ON `models` (`status`);--> statement-breakpoint
CREATE INDEX `scores_model_idx` ON `scores` (`modelId`);--> statement-breakpoint
CREATE INDEX `scores_benchmark_idx` ON `scores` (`benchmarkId`);