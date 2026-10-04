import { NotFoundError } from "@/shared/errors/index.ts";
import { userRepository, type UserRepository } from "./user.repositories.ts";

export class UserService {
  constructor(private readonly repo: UserRepository = userRepository) {}

  async getUserById(id: string) {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID '${id}' not found`);
    }
    return user;
  }

  async getDefaultUser() {
    const user = await this.repo.findDefaultUser();
    if (!user) {
      throw new NotFoundError("Default user not found. Please run database seeds.");
    }
    return user;
  }

  async updateUser(id: string, data: { displayName?: string; nativeLanguage?: string; englishLevel?: string }) {
    await this.getUserById(id);
    const updated = await this.repo.update(id, data as any);
    if (!updated) {
      throw new NotFoundError(`Failed to update user with ID '${id}'`);
    }
    return updated;
  }

  async getUserAnalytics(userId?: string) {
    if (!userId) {
      const defaultUser = await this.getDefaultUser();
      userId = defaultUser.id;
    } else {
      await this.getUserById(userId);
    }
    return this.repo.getUserAnalytics(userId);
  }
}

export const userService = new UserService();
