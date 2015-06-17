use Rack::Static,
  :urls => ["/images", "/js", "/css", "/bower_components", "/favicon-angellist.ico"],
  :root => "public"

run lambda { |env|
  [
    200,
    {
      'Content-Type'  => 'text/html',
    },
    File.open('public/index.html', File::RDONLY)
  ]
}
