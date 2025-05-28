import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class StockAnalysis {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    stockSymbol: string;

    @Column('simple-json', { default: '[]' })
    portfolioIds: number[];

    @Column()
    sector: string;

    @Column('decimal', { precision: 5, scale: 2 })
    healthScore: number;

    @Column('decimal', { precision: 5, scale: 2 })
    valueScore: number;

    @Column('decimal', { precision: 5, scale: 2 })
    totalScore: number;

    @Column()
    recommendation: string;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    pe: number;

    @Column('decimal', { precision: 5, scale: 4, nullable: true })
    dividendYield: number;

    @Column('decimal', { precision: 5, scale: 4, nullable: true })
    profitMargins: number;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    discountAllTimeHigh: number;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    debtToEquity: number;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    price: number;

    @Column()
    analyzedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 