import { Resolver, Query, Context, Args, Mutation } from '@nestjs/graphql';
import { Server } from './types';
import { Request } from 'express';
import { Injectable, UseGuards } from '@nestjs/common';
import { GraphqlAuthGuard } from '../auth/auth.guard';
import { GraphQLError } from 'graphql/error';
import { ServerService } from './server.service';
import { CreateServerDto } from './dto';
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js';
import { v4 as uuidv4 } from 'uuid';
import * as process from 'process';
import { join } from 'path';
import { createWriteStream, existsSync, mkdir, mkdirSync } from 'fs';

@Injectable()
@UseGuards(GraphqlAuthGuard)
@Resolver()
export class ServerResolver {
  constructor(private readonly serverService: ServerService) {}

  @Query(() => [Server])
  async getServers(@Context() ctx: { req: Request }) {
    if (!ctx.req?.profile.email)
      return new GraphQLError('Profile not found', {
        extensions: { code: 'PROFILE_NOT_FOUND' },
      });

    return this.serverService.gerServersByProfileEmailOfMember(
      ctx.req?.profile.email,
    );
  }

  @Mutation(() => Server)
  async createServer(
    @Args('input') input: CreateServerDto,
    @Args('file', { type: () => GraphQLUpload, nullable: true })
    file: GraphQLUpload,
  ) {
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
}
