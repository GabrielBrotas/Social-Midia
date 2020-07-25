# Social-Midia
 
## Getting start with Firebase;

   1 - Criar o projeto no site do google firebase;

   2 - Ir em 'Functions' -> "Get Start"
	instalar o "npm install -g firebase-tools" que vai da acesso a command line do firebase

   2.1 - no cmd na pasta do projeto 
	>firebase login # para logar na conta do firebase

   3 - >firebase init # iniciar um projeto novo 
 	-> yes
	-> Functions
	-> Escolher o projeto que criou inicialmente 
	-> JavaScript
	-> 'Do you want to use ESLint to catch probable bugs and enforce style? No' No
	-> 'Do you want to install dependencies with npm now? Yes'Yes (instalar os pacotes que precisa)
	-> code . # abrir o visual studio code

   4 - Arquivos criados.
   
   4.1 - .firebaserc # é o config file que tem o id do projeto.
   
   4.2 - Na pasta functions -> index.js # é onde as funcões vao ficar.
   
   4.3 - >firebase deploy  # no cmd para atualizar o Arquivos ( A conta tem que estar no plan Blaze)
   
        Url para colocar no postman e verificar retorno. ex:
        https://us-central1-social-midia-4629c.cloudfunctions.net/helloWorld
	
   4.4 - Feito isso vai estar conectado com o firebase

5 - Inicializar o database

   - Criar o Cloud Firestore no modo test

   - Criar uma collection com o nome 'screams'
   - criar um documento para essa collection   
       Field: userHandle, type: string, Value: user
       Field: body, type: string, Value: First screams example
       Field: createdAt, type: timestamp, com a data e hora que foi criada

   - Criar outra screams para essa collection  
       Field: userHandle, type: string, Value: user
       Field: body, type: string, Value: Second screams example
       Field: createdAt, type: timestamp, com a data e hora que foi criada
    
       >firebase serve # vai criar um server local para nao ter que fazer deploy sempre que tiver uma mudança no codigo

6 - Register New user

   - no console do firebase ir em Authentication > 'Sign-in method' e ativar "Email/Password"

   - ir em 'settings' e pegar o script do firebase na pasta de "Your apps" para adicionar na config do projeto em functions

        
7 - Criar bucket no Firebase Storage para fazer upload de arquivos e nas rules vamos colocar 'allow read'; no lugar de 'allow read, write: if request.auth != null;'
