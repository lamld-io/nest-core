import { Injectable } from "@nestjs/common"
import type { AuthRecord } from "./auth.types.js"

@Injectable()
export class AuthRepository {
  findByEmail(_email: string): Promise<AuthRecord | null> {
    return Promise.resolve(null)
  }
}
