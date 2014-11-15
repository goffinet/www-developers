var path = require('path')
var cp = require('child_process')
var config = require('./config')



module.exports = function(server){

  server.route([
    {
      path: '/preview',
      method: 'get',
      handler: {
        view: 'index'
      }
    },
    {
      path: '/assets/{path*}',
      method: 'get',
      config: {
        pre: [function(req, rep){
          if (!config.isDev) return rep()
          cp.exec('npm run build-client', function(err){
            if (err) throw err
            rep()
          })
        }]
      },
      handler: {
        directory: {
          path: path.join(__dirname, '../client')
        }
      }
    }
  ])
}
