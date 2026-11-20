import { handle, type Env } from '../../server/api'

export const onRequest: PagesFunction<Env> = ({ request, env }) => handle(request, env)
