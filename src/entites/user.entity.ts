import { Column, Entity, Generated, PrimaryColumn } from "typeorm";

@Entity()
export class User {
    
    @PrimaryColumn({type:"uuid"})
    @Generated("uuid") id: string;

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