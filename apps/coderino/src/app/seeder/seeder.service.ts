import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../entites/user.entity';

@Injectable()
export class SeederService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}
  async onModuleInit() {
    const count = await this.userRepository.count();
    if (count == 0) {
      await this.seed();
    }
  }

  async seed() {
    const user = new User();
    user.active = true;
    user.firstName = 'John';
    user.lastName = 'Doe';
    user.password = await bcrypt.hash('test', 10);
    user.mail = 'john.doe@example.io';
    user.username = 'johndoe';
    user.lastActivityAt = new Date();

    await this.userRepository.save(user);
  }
}
