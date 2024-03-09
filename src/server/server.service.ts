import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  CreateChannelOnServerDto,
  CreateServerDto,
  UpdateServerDto,
} from './dto';
import { v4 as uuidv4 } from 'uuid';
import { MemberRole } from '../member/member.types';
import { GraphQLError } from 'graphql/error';
import { ChannelType } from './types';

@Injectable()
export class ServerService {
  constructor(private readonly prisma: PrismaService) {}

  async createServer(input: CreateServerDto, imageUrl: string) {
    const profile = await this.prisma.profile.findUnique({
      where: {
        id: input.profileId,
      },
    });
    if (!profile) throw new BadRequestException('Profile not found');

    return this.prisma.server.create({
      data: {
        ...input,
        imageUrl,
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
    const profile = await this.prisma.profile.findUnique({
      where: { email },
    });

    if (!profile)
      return new GraphQLError('Profile not found', {
        extensions: { code: 'PROFILE_NOT_FOUND' },
      });

    const server = await this.prisma.server.findUnique({
      where: {
        id,
        members: {
          some: {
            profileId: profile.id,
          },
        },
      },
      include: {
        channels: true,
        members: true,
      },
    });

    if (!server)
      return new GraphQLError('Server not found', {
        extensions: { code: 'SERVER_NOT_FOUND' },
      });

    return server;
  }

  async getServersByProfileEmailOfMember(email: string) {
    return this.prisma.server.findMany({
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

  async updateServerWithNewInviteCode(serverId: number) {
    const server = await this.prisma.server.findUnique({
      where: {
        id: serverId,
      },
    });

    if (!server) throw new Error('Server not found');

    return this.prisma.server.update({
      where: {
        id: serverId,
      },
      data: {
        inviteCode: uuidv4(),
      },
    });
  }

  async updateServer(input: UpdateServerDto, imageUrl: string) {
    const server = await this.prisma.server.findUnique({
      where: {
        id: input.serverId,
      },
    });

    if (!server) throw Error('Server not found');

    return this.prisma.server.update({
      where: {
        id: server.id,
      },
      data: {
        name: input.name,
        imageUrl,
      },
    });
  }

  async createChannel(input: CreateChannelOnServerDto, email: string) {
    if (!input.name) throw new Error('Channel name is required');

    const profile = await this.prisma.profile.findUnique({
      where: {
        email,
      },
    });

    if (!profile) throw new Error('Profile not found');

    return this.prisma.server.update({
      where: {
        id: input.serverId,
        members: {
          some: {
            profileId: profile.id,
            role: {
              in: [MemberRole.ADMIN, MemberRole.MODERATOR],
            },
          },
        },
      },
      data: {
        channels: {
          create: {
            name: input.name,
            profileId: profile.id,
            type: ChannelType[input.type],
          },
        },
      },
    });
  }
}
