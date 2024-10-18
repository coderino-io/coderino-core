import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
    
    @PrimaryGeneratedColumn()
    id:number;

    @Column()
    username:string;

    @Column()
    password:string;

    @Column()
    mail:string;

    @Column()
    firstname:string;

    @Column()
    lastname: string;

    @Column()
    active: boolean;

    @Column()
    lastActivity: Date;
}