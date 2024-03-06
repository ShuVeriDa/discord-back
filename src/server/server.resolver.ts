import { Resolver, Query, Context, Args, Mutation } from '@nestjs/graphql';
import { Server } from './types';
import { Request } from 'express';
import { UseGuards } from '@nestjs/common';
import { GraphqlAuthGuard } from '../auth/auth.guard';
import { GraphQLError } from 'graphql/error';
import { ServerService } from './server.service';
import { CreateServerDto } from './dto';
import { GraphQLUpload } from 'graphql-upload/Upload';
import { v4 as uuidv4 } from 'uuid';
import * as process from 'process';
import { join } from 'path';

@Resolver()
export class ServerResolver {
  constructor(private readonly serverService: ServerService) {}

  @UseGuards(GraphqlAuthGuard)
  @Query(() => [Server])
  async getServers(
    @Args('profileId') profileId: number,
    @Context() ctx: { req: Request },
  ) {
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
    let imageUrl;

    if (file) {
      imageUrl = await this.storeImageAndGetUrl(file);
    }

    return this.serverService.createServer(input, imageUrl);
  }

  private async storeImageAndGetUrl(file: GraphQLUpload) {
    const { createReadStream, filename } = await file;

    const uniqueFilename = `${uuidv4()}_${filename}`;
    const imagePath = join(process.cwd(), 'public', 'images', uniqueFilename);
    const imageUrl = `${process.env.APP_URL}/images/${uniqueFilename}`;

    const readStream = createReadStream();
    readStream.pipe(createReadStream(imagePath));
    return imageUrl;
  }
}
