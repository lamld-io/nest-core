import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common"
import { Public } from "../../../../libs/platform-auth/src/index.js"
import { AuthService } from "./auth.service.js"
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js"
import { LocalAuthGuard } from "./guards/local-auth.guard.js"
import { LoginDto } from "./dto/login.dto.js"

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post("login")
  async login(
    @Body() _loginDto: LoginDto,
    @Req() request: { user: Awaited<ReturnType<AuthService["validateUser"]>> }
  ) {
    return this.authService.issueTokens(request.user)
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Req() request: { user: Parameters<AuthService["getProfileFromClaims"]>[0] }) {
    return this.authService.getProfileFromClaims(request.user)
  }
}
