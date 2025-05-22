import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class StockAnalysis {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    stockSymbol: string;

    @Column({ nullable: true })
    sector: string;

    @Column("float")
    healthScore: number;

    @Column("float")
    valueScore: number;

    @Column("float")
    totalScore: number;

    @Column()
    recommendation: string;

    @Column("float", { nullable: true })
    pe: number | null;

    @Column("float", { nullable: true })
    dividendYield: number | null;

    @Column("float", { nullable: true })
    profitMargins: number | null;

    @Column("float", { nullable: true })
    discountAllTimeHigh: number | null;

    @Column("float", { nullable: true })
    price: number | null;

    @CreateDateColumn()
    analyzedAt: Date;
} 