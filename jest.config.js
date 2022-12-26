module.exports = {
    transform: {'^.+\\.[tj]s?$': 'ts-jest'},
    testEnvironment: 'node',
    testRegex: '.*\\.(test|spec)?\\.(ts|tsx)$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
};
