if which node > /dev/null
then
    echo "node is installed, skipping..."
else
   echo "install node"
   echo "brew install node"
   exit
fi
npm install
node index.js
