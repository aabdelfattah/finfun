import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class StockAnalysis {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    stockSymbol: string;

    @Column("float")
    healthScore: number;

    @Column("float")
    valueScore: number;

    @Column("float")
    totalScore: number;

    @Column()
    recommendation: string;

    @Column("float", { nullable: true })
    pe: number;

    @Column("float", { nullable: true })
    dividendYield: number;

    @Column("float", { nullable: true })
    profitMargins: number;

    @Column("float", { nullable: true })
    discountAllTimeHigh: number;

    @CreateDateColumn()
    analyzedAt: Date;
} 