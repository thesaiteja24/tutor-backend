import { NotFoundError } from "@/shared/errors/index.ts";

import { type PersonaRepository,personaRepository } from "./persona.repositories.ts";
import type { CreatePersonaInput, ListPersonasQuery, UpdatePersonaInput } from "./persona.schemas.ts";

export class PersonaService {
  constructor(private readonly repo: PersonaRepository = personaRepository) {}

  async listPersonas(query: ListPersonasQuery) {
    return this.repo.findMany(query);
  }

  async getPersonaById(id: string) {
    const persona = await this.repo.findById(id);
    if (!persona) {
      throw new NotFoundError(`Persona with ID '${id}' not found`);
    }
    return persona;
  }

  async createPersona(input: CreatePersonaInput) {
    return this.repo.create({
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      voiceId: input.voiceId,
    });
  }

  async updatePersona(id: string, input: UpdatePersonaInput) {
    await this.getPersonaById(id);

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new NotFoundError(`Persona with ID '${id}' not found`);
    }
    return updated;
  }

  async deletePersona(id: string) {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Persona with ID '${id}' not found`);
    }
  }
}

export const personaService = new PersonaService();
