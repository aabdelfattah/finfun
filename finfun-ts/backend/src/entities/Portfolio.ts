import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Portfolio {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    stockSymbol: string;

    @Column("float")
    allocationPercentage: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 