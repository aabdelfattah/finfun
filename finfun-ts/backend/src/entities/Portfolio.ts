import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity()
export class Portfolio {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ nullable: true })
    name!: string;

    @Column()
    userId!: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user!: User;

    @OneToMany(() => PortfolioStock, portfolioStock => portfolioStock.portfolio)
    stocks!: PortfolioStock[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

@Entity()
export class PortfolioStock {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    stockSymbol!: string;

    @Column('float')
    allocationPercentage!: number;

    @Column()
    portfolioId!: number;

    @ManyToOne(() => Portfolio, portfolio => portfolio.stocks)
    @JoinColumn({ name: 'portfolioId' })
    portfolio!: Portfolio;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
} 