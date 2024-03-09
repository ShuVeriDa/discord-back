import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Server } from './types';
import { Request } from 'express';
import { Injectable, UseGuards } from '@nestjs/common';
import { GraphqlAuthGuard } from '../auth/auth.guard';
import { GraphQLError } from 'graphql/error';
import { ServerService } from './server.service';
import {
  CreateChannelOnServerDto,
  CreateServerDto,
  UpdateServerDto,
} from './dto';
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { createWriteStream, existsSync, mkdir, mkdirSync } from 'fs';

@Injectable()
@UseGuards(GraphqlAuthGuard)
@Resolver()
export class ServerResolver {
  constructor(private readonly serverService: ServerService) {}

  @Query(() => [Server])
  async getServers(@Context() ctx: { req: Request }) {
    // if (!ctx.req?.profile.email) {
    //   return new GraphQLError('Profile not found', {
    //     extensions: { code: 'PROFILE_NOT_FOUND' },
    //   });
    // }

    return await this.serverService.getServersByProfileEmailOfMember(
      ctx.req?.profile.email,
    );
  }

  @Query(() => [Server])
  async getServer(@Context() ctx: { req: Request }, @Args('id') id: number) {
    // if (!ctx.req?.profile.email) {
    //   return new GraphQLError('Profile not found', {
    //     extensions: { code: 'PROFILE_NOT_FOUND' },
    //   });
    // }

    return await this.serverService.getServer(id, ctx.req?.profile.email);
  }

  @Mutation(() => Server)
  async createServer(
    @Args('input') input: CreateServerDto,
    @Args('file', { type: () => GraphQLUpload, nullable: true })
    file: GraphQLUpload,
  ) {
    if (!file)
      throw new GraphQLError('Image is required', {
        extensions: { code: 'IMAGE_REQUIRED' },
      });

    const imageUrl = await this.storeImageAndGetUrl(file);

    return this.serverService.createServer(input, imageUrl);
  }

  async storeImageAndGetUrl(file: GraphQLUpload) {
    const { createReadStream, filename } = await file;
    const uniqueFilename = `${uuidv4()}_${filename}`;
    const imagePath = join(process.cwd(), 'public', 'images', uniqueFilename);
    const imageUrl = `${process.env.APP_URL}/images/${uniqueFilename}`;

    if (!existsSync(join(process.cwd(), 'public', 'images'))) {
      mkdirSync(join(process.cwd(), 'public', 'images'), { recursive: true });
    }

    const readStream = createReadStream();
    readStream.pipe(createWriteStream(imagePath));
    return imageUrl;
  }

  @Mutation(() => Server)
  async updateServer(
    @Args('input') input: UpdateServerDto,
    @Args('file', { type: () => GraphQLUpload, nullable: true })
    file: GraphQLUpload,
  ) {
    let imageUrl;

    if (file) {
      imageUrl = await this.storeImageAndGetUrl(file);
    }

    try {
      return this.serverService.updateServer(input, imageUrl);
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: { code: error.code },
      });
    }
  }

  @Mutation(() => Server)
  async updateServerWithNewInviteCode(
    @Args('serverId', { nullable: true }) serverId: number,
  ) {
    if (!serverId)
      throw new GraphQLError('Server id is required', {
        extensions: { code: 'SERVER_ID_REQUIRED' },
      });

    try {
      return this.serverService.updateServerWithNewInviteCode(serverId);
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: { code: error.code },
      });
    }
  }

  @Mutation(() => Server)
  async createChannel(
    @Args('input') input: CreateChannelOnServerDto,
    @Context() ctx: { req: Request },
  ) {
    try {
      return this.serverService.createChannel(input, ctx.req?.profile.email);
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: { code: error.code },
      });
    }
  }
}
