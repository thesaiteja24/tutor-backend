import { NotFoundError } from "@/shared/errors/index.ts";

import { type PracticeModeRepository,practiceModeRepository } from "./practice-mode.repositories.ts";
import type { CreatePracticeModeInput, ListPracticeModesQuery, UpdatePracticeModeInput } from "./practice-mode.schemas.ts";

export class PracticeModeService {
  constructor(private readonly repo: PracticeModeRepository = practiceModeRepository) {}

  async listPracticeModes(query: ListPracticeModesQuery) {
    return this.repo.findMany(query);
  }

  async getPracticeModeById(id: string) {
    const mode = await this.repo.findById(id);
    if (!mode) {
      throw new NotFoundError(`Practice mode with ID '${id}' not found`);
    }
    return mode;
  }

  async createPracticeMode(input: CreatePracticeModeInput) {
    return this.repo.create({
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
    });
  }

  async updatePracticeMode(id: string, input: UpdatePracticeModeInput) {
    await this.getPracticeModeById(id);

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new NotFoundError(`Practice mode with ID '${id}' not found`);
    }
    return updated;
  }

  async deletePracticeMode(id: string) {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Practice mode with ID '${id}' not found`);
    }
  }
}

export const practiceModeService = new PracticeModeService();
