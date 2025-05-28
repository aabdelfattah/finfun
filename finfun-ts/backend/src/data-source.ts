import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Portfolio } from "./entities/Portfolio";
import { StockAnalysis } from "./entities/StockAnalysis";
import { Config } from "./entities/Config";
import { SectorMetrics } from "./entities/SectorMetrics";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "finfun",
    synchronize: true,
    dropSchema: true,
    logging: true,
    entities: [User, Portfolio, StockAnalysis, Config, SectorMetrics],
    subscribers: [],
}); 