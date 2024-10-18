import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entites/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeederService implements OnModuleInit{
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ){}
       async onModuleInit() {
            const count = await this.userRepository.count();
            if(count == 0){
                await this.seed();
            }
        }

        async seed(){
            const user = new User();
            user.active = true;
            user.firstname = "John";
            user.lastname = "Doe";
            user.password = await bcrypt.hash("test", 10);
            user.mail = "john.doe@example.io";
            user.username = "johndoe";
            user.lastActivity = new Date();
            
            await this.userRepository.save(user);
        }
}