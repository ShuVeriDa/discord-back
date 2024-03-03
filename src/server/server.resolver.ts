import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class ServerResolver {
  @Query(() => String)
  async hello() {
    return 'Hello';
  }
}
