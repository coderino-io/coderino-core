import { Guid } from "guid-typescript";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
    
    @PrimaryGeneratedColumn()
    id:Guid;

    @Column()
    username:string;

    @Column()
    password:string;

    @Column()
    mail:string;

    @Column()
    firstName:string;

    @Column()
    lastName: string;

    @Column()
    active: boolean;

    @Column()
    lastActivityAt: Date;
}