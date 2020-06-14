jest.mock('mailgun-js')
jest.mock('../../lib/users')
jest.mock('../../sequelize/db')

const db = require('../../sequelize/db')
const {resetPassword, createUser, deleteUser, loginUser, logoutUser} = require('./userRoutes')
const {sendPasswordResetEmail, signUp, logIn} = require('../../lib/users')


const mockFindOne = jest.fn()
db.getModels = () => {
    return {
    Accounts: {
      findOne: mockFindOne
    }
}
}

const res = {
  status: jest.fn().mockImplementation(() => {
    return res
}),
  json: jest.fn()
}

describe('Testing resetPassword function', () => {
    beforeEach(() => {
    jest.clearAllMocks()
  })
  
  test('should send 400 error if req body does not have email', async () => {
    const req = {
      body: {}
    }

    await resetPassword(req, res)
    expect(res.status.mock.calls[0][0]).toEqual(400)
    expect(res.json.mock.calls[0][0]).toEqual({error: {message: "invalid input"}})
  })
  
  test('Should send 400 error if user account does not exist', async () => {
      const req = {
     body: {
         email: 'hello@world.com',
     } 
    } 

    await resetPassword(req, res)
    expect(res.status.mock.calls[0][0]).toEqual(400)
    expect(res.json.mock.calls[0][0]).toEqual({error: {message: "Account does not exist"}})
})

test('should send 500 error if send password throws error', async () => {
    const userAccount = {
        id: 1,
      email: 'hello@world.com'
    }

    mockFindOne.mockReturnValue(userAccount)

    const req = {
        body: {
        email: 'hello@world.com'
    }
    }

    sendPasswordResetEmail.mockImplementation(() => {
      throw new Error('error') 
    })

    await resetPassword(req, res)
    expect(res.status.mock.calls[0][0]).toEqual(500)
    expect(res.json.mock.calls[0][0]).toEqual({ error: {message: 'Email delivery failed. Please try again'}})
})

  test('should send 200 success if send password is successful', async () => {
      const userAccount = {
      id: 2,
      email: 'hello@world.com',
    }

    mockFindOne.mockReturnValue(userAccount)

    const req = {
      body: {
        email: 'hello@world.com' 
    } 
    }

    sendPasswordResetEmail.mockImplementation(() => {
      return {
        dataValues: {
          email: 'hello@world.com',
          password: 'as1f6lurdh8f632la'
        }
      }
    })

    await resetPassword(req, res)
    expect(res.status.mock.calls[0][0]).toEqual(200)
    expect(res.json.mock.calls[0][0].email).toEqual('hello@world.com')
  })
})

describe('Testing createUser function', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })
  it('should send error if sign up fails', async () => {
      signUp.mockImplementation(() => {
          throw new Error('Error')
      })
      const req = {
          body: {
              username: 'username',
              email: 'em@i.l',
              password: '1q2'
          }
      }
      await createUser(req, res)
      expect(res.status.mock.calls[0][0]).toEqual(500)
      return expect(res.json.mock.calls[0][0].error.message).toEqual('Creating user failed. Please try again')
  })
  it('should create user account', async () => {
      signUp.mockImplementation(() => {
        return {
          dataValues: {
            email: 'em@i.l',
            password: 'as1f6lurdh8f632la'
          }
        }
      })
      const req = {
        body: {
          username: 'username',
          email: 'em@i.l',
          password: '1q2w3e4r'
        }
      }
      await createUser(req, res)
      expect(res.status.mock.calls[0][0]).toEqual(200)
      return expect(res.json.mock.calls[0][0].email).toEqual('em@i.l')
  })
})

describe('Testing deleteUser function', () => {
  beforeEach(() => {
      jest.clearAllMocks()
  })
  it('should send error if input is invalid', async () => {
      const req = {
          params: { id: null }
      }
      await deleteUser(req, res)
      expect(res.status.mock.calls[0][0]).toEqual(400)
      return expect(res.json.mock.calls[0][0].error.message).toEqual("user id was not provided")
  })
  it('should send error if account is not found', async () => {
      const req = {
          params: { id: 99999999 }
      }
      mockFindOne.mockReturnValue(null)
      await deleteUser(req, res)
      expect(res.status.mock.calls[0][0]).toEqual(404)
      return expect(res.json.mock.calls[0][0].error.message).toEqual("Cannot find user")
  })
  it('should send error if user session does not match', async () => {
      const req = {
          params: { id: 99999999 },
          session: { username: 'testuserA' }
        }
      mockFindOne.mockReturnValue({
          username: 'testuserB'
      })
      await deleteUser(req, res)
      expect(res.status.mock.calls[0][0]).toEqual(403)
      return expect(res.json.mock.calls[0][0].error.message).toEqual("Username does not match to cookie")
  })
  it('should delete user', async () => {
      const req = {
          params: { id: 99999999 },
          session: { username: 'testuserA' }
      }
      mockFindOne.mockReturnValue({
        username: 'testuserA',
        destroy: () => {},
        dataValues: {
          username: 'testuserA',
          password: 'as1f6lurdh8f632la'
        }
      })
      await deleteUser(req, res)
      expect(res.status.mock.calls[0][0]).toEqual(200)
      return expect(res.json.mock.calls[0][0].username).toEqual('testuserA')
  })
  it('should send error if delete user fails', async () => {
      const req = {
          params: { id: 99999999 },
          session: { username: 'testuserA' }
      }
      mockFindOne.mockReturnValue({
          username: 'testuserA',
          destroy: () => { throw new Error('Error')}
      })
      await deleteUser(req, res)
      expect(res.status.mock.calls[0][0]).toEqual(500)
      return expect(res.json.mock.calls[0][0].error.message).toEqual("Deleting user failed. Please try again")
  })
})

describe('testing loginUser function', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })
    it('should send error if login fails', async () => {
        logIn.mockImplementation(() => {
            throw new Error('Error')
        })
        const req = {
            body: {
                username: 'username',
                email: 'em@i.l',
                password: '1q2w3e4r'
            }
        }
        await loginUser(req, res)
        expect(res.status.mock.calls[0][0]).toEqual(500)
        return expect(res.json.mock.calls[0][0].error.message).toEqual('Login user failed. Please try again')
    })
    it('should login user', async () => {
        logIn.mockImplementation(() => {
            return {
                username: 'username',
                dataValues: {
                    username: 'username',
                    password: 'iehpuf6712hifsd1'
                }
            }
        })
        const req = {
            body: {
                username: 'username',
                email: 'em@i.l',
                password: '1q2w3e4r'
            },
            session: {}
        }
        await loginUser(req, res)
        expect(res.status.mock.calls[0][0]).toEqual(200)
        return expect(res.json.mock.calls[0][0].username).toEqual('username')
    })
})

describe('testing logoutUser function', () => {
    it('should clear session', () => {
        const req = {
            params: { id: 99999999 },
            session: { username: 'username' }
        }
        logoutUser(req, res)
        expect(req.session.username).toEqual('')
    })
})