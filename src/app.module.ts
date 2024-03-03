import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { ServerService } from './server/server.service';
import { ServerResolver } from './server/server.resolver';
import { ProfileModule } from './profile/profile.module';
import { MemberModule } from './member/member.module';
import * as process from 'process';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),

    GraphQLModule.forRootAsync({
      imports: [],
      inject: [],
      driver: ApolloDriver,
      useFactory: async () => {
        return {
          autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
          sortSchema: true,
          subscriptions: {},
        };
      },
    }),

    ProfileModule,

    MemberModule,
  ],
  controllers: [AppController],
  providers: [AppService, ServerService, ServerResolver],
})
export class AppModule {}
