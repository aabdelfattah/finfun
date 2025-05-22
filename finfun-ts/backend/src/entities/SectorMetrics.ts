import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class SectorMetrics {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    sector: string;

    @Column('float')
    dividendYieldMean: number;

    @Column('float')
    dividendYieldStdev: number;

    @Column('float')
    profitMarginsMean: number;

    @Column('float')
    profitMarginsStdev: number;

    @Column('float')
    debtToEquityMean: number;

    @Column('float')
    debtToEquityStdev: number;

    @Column('float')
    peMean: number;

    @Column('float')
    peStdev: number;

    @Column('float')
    discountFrom52WMean: number;

    @Column('float')
    discountFrom52WStdev: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 