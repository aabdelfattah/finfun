import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity()
@Index(['stockSymbol', 'analysisType']) // Index for efficient lookups
export class AIStockAnalysis {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    stockSymbol: string;

    @Column({ default: 'standard' })
    analysisType: string; // 'quick', 'standard', 'deep'

    @Column('text')
    analysisText: string;

    @Column('simple-json', { nullable: true })
    portfolioIds: number[]; // Which portfolios this analysis applies to

    @Column({ default: true })
    success: boolean;

    @Column('text', { nullable: true })
    errorMessage: string | null;

    @Column()
    analyzedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Helper method to check if analysis is fresh (within 24 hours)
    isFresh(): boolean {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return this.analyzedAt > twentyFourHoursAgo;
    }
} 