import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateServerDto } from './dto';
import { v4 as uuidv4 } from 'uuid';
import { MemberRole } from '../member/member.types';
import { GraphQLError } from 'graphql/error';

@Injectable()
export class ServerService {
  constructor(private readonly prismaa: PrismaService) {}

  async createServer(input: CreateServerDto, imageUrl: string) {
    const profile = await this.prismaa.profile.findUnique({
      where: {
        id: input.profileId,
      },
    });

    if (!profile) throw new BadRequestException('Profile not found');

    return this.prismaa.server.create({
      data: {
        ...input,
        imageUrl: imageUrl,
        inviteCode: uuidv4(),

        channels: {
          create: [
            {
              name: 'general',
              profileId: profile.id,
            },
          ],
        },
        members: {
          create: [
            {
              profileId: profile.id,
              role: MemberRole.ADMIN,
            },
          ],
        },
      },
      include: {
        members: true,
      },
    });
  }

  async getServer(id: number, email: string) {
    const profile = await this.prismaa.profile.findUnique({
      where: { email },
    });

    if (!profile)
      return new GraphQLError('Profile not found', {
        extensions: { code: 'PROFILE_NOT_FOUND' },
      });

    const server = await this.prismaa.server.findUnique({
      where: {
        id,
        members: {
          some: {
            profileId: profile.id,
          },
        },
      },
    });

    if (!server)
      return new GraphQLError('Server not found', {
        extensions: { code: 'SERVER_NOT_FOUND' },
      });

    return server;
  }

  async gerServersByProfileEmailOfMember(email: string) {
    return this.prismaa.server.findMany({
      where: {
        members: {
          some: {
            profile: {
              email,
            },
          },
        },
      },
    });
  }
}
