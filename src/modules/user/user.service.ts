import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { safeExecute } from '../../shared/utils/safe-execute';

@Injectable()
export class UserService {
  constructor(private readonly users: UserRepository) {}

  async listUsers(query: ListUsersQueryDto) {
    return safeExecute(
      () =>
        this.users.findUsers({
          page: query.page,
          limit: query.limit,
          search: query.search,
          role: query.role,
        }),
      {
        context: 'UserService.listUsers',
        humanMessage: 'Gagal mengambil daftar pengguna.',
      },
    );
  }

  async getProfile(userId: number) {
    return safeExecute(
      async () => {
        const profile = await this.users.findProfileByUserId(userId);
        if (!profile) {
          throw new NotFoundException('Profile tidak ditemukan.');
        }
        return profile;
      },
      {
        context: 'UserService.getProfile',
        humanMessage: 'Gagal mengambil profil.',
      },
    );
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    return safeExecute(
      async () => {
        await this.getProfile(userId);
        return this.users.updateProfile(userId, dto.fullName);
      },
      {
        context: 'UserService.updateProfile',
        humanMessage: 'Gagal memperbarui profil.',
      },
    );
  }
}
