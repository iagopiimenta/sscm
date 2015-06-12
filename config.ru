use Rack::Static,
  :urls => ["/images", "/js/app.min.js", "/css", "/bower_components"],
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
