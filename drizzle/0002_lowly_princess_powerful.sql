CREATE TABLE `rankSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modelId` int NOT NULL,
	`snapshotDay` varchar(10) NOT NULL,
	`compositeScore` decimal(6,2),
	`rankOverall` int,
	`evidenceCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rankSnapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `rank_snapshots_model_day_idx` UNIQUE(`modelId`,`snapshotDay`)
);
--> statement-breakpoint
ALTER TABLE `models` ADD `contextTokens` int;--> statement-breakpoint
ALTER TABLE `models` ADD `priceSourceUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `models` ADD `contextSourceUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `models` ADD `releaseSourceUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `models` ADD `commercialNote` text;--> statement-breakpoint
CREATE INDEX `rank_snapshots_day_idx` ON `rankSnapshots` (`snapshotDay`);