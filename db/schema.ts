import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const researchAccounts=sqliteTable('research_accounts',{userId:text('user_id').primaryKey(),config:text('config').notNull(),revision:integer('revision').notNull().default(0)});
export const researchPositions=sqliteTable('research_positions',{id:text('id').primaryKey(),userId:text('user_id').notNull(),data:text('data').notNull(),closedAt:text('closed_at'),revision:integer('revision').notNull().default(0)});
export const researchEvents=sqliteTable('research_events',{id:text('id').primaryKey(),userId:text('user_id').notNull(),positionId:text('position_id').notNull(),kind:text('kind').notNull(),data:text('data').notNull(),createdAt:text('created_at').notNull()});
export const socialCache=sqliteTable('social_cache',{address:text('address').primaryKey(),data:text('data').notNull(),fetchedAt:integer('fetched_at').notNull()});
export const socialUsage=sqliteTable('social_usage',{id:text('id').primaryKey(),requests:integer('requests').notNull().default(0)});
export const researchLocks=sqliteTable('research_locks',{id:text('id').primaryKey(),owner:text('owner').notNull(),expires:integer('expires').notNull()});
