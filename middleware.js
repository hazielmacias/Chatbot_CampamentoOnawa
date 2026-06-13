const OLD_HOSTS = [
  'chatbot-campamento-onawa.vercel.app'
];

const NEW_HOST = 'chatbot-campamento-onawa-ly3i.vercel.app';

export default function middleware(request) {
  const url = new URL(request.url);

  if (OLD_HOSTS.includes(url.host)) {
    url.host = NEW_HOST;
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  return undefined;
}

export const config = {
  matcher: '/:path*'
};
