# l_f_ana.py
# import matplotlib.pyplot as plt
# import csv
import datetime
import math
import numpy as np
import numpy.linalg as npl
import xml.etree.ElementTree as ET
# tree = ET.parse('Python/Ana/2014-08-07-70.kml')
# tree = ET.parse('Python/Ana/pigeonHQ.kml')
ts = []
coord = []
speed = []
speedAbsolut = []
speedNorm = []
listofThree = []
offSetL = 8.9
offSetB = 47.7
earthR = 3671000.
newBirdIndexList = [0]
allBirds = []


def get_list(l_f_param):
    countAll = 0

    if l_f_param['dataset'] == 0:
        tree = ET.parse('Apps/SampleData/kml/2014-08-07-70.kml')
        format = "%Y-%m-%dT%H:%M:%SZ"
        tMax = 300
        datafreq = 1
    elif l_f_param['dataset'] == 1:
        tree = ET.parse('Apps/SampleData/kml/pigeon/pigeonHQ.kml')
        format = "%Y-%m-%dT%H:%M:%S.%fZ"
        tMax = 500
        datafreq = 4
    elif l_f_param['dataset'] == 2:
        tree = ET.parse('Apps/SampleData/kml/random30.kml')
        format = "%Y-%m-%dT%H:%M:%S"
        tMax = 300
        datafreq = 1
    elif l_f_param['dataset'] == 3:
        tree = ET.parse('Apps/SampleData/kml/pigeon/n30Data.kml')
        format = "%Y-%m-%dT%H:%M:%S.%fZ"
        tMax = 1000
        datafreq = 10
    elif l_f_param['dataset'] == 4:
        tree = ET.parse('Python/Ana/coordMod.kml')
        format = "%Y-%m-%dT%H:%M:%S.%fZ"
        tMax = 500
        datafreq = 4

    root = tree.getroot()

    class Bird(object):
        def __init__(self, iD, time, coord, speed, speedAbsolut, speedNorm):
            self.iD = iD
            self.time = time
            self.coord = coord
            self.speed = speed
            self.speedAbsolut = speedAbsolut
            self.speedNorm = speedNorm

    # .%f
    for n in root.iter('{http://www.opengis.net/kml/2.2}when'):
        ts.append(datetime.datetime.strptime(n.text, format))
        if countAll > 0:
            if (ts[countAll] - ts[countAll - 1]) < datetime.timedelta(0):
                newBirdIndexList.append(countAll)
        countAll = countAll + 1

    newBirdIndexList.append(countAll)

    countAll = 0
    i = 0

    for n in root.iter('{http://www.google.com/kml/ext/2.2}coord'):
        listofThree = list(map(float, n.text.split(",")))  # Read the Values in Deg
        listofThree[0] = ((listofThree[0] - offSetL)/360.) * 2. * \
            math.pi * earthR * math.cos((47./360.) * math.pi)

        listofThree[1] = ((listofThree[1] - offSetB)/360.) * 2.*math.pi * earthR
        coord.append(np.array(listofThree))
        if countAll == newBirdIndexList[i]:
            speed.append(None)
            speedAbsolut.append(None)
            speedNorm.append(None)
            i = i + 1
        else:
            speedCur = coord[countAll] - coord[countAll - 1]
            speed.append(speedCur)
            speedAbsolut.append(npl.norm(speedCur))
            speedNorm.append(speedCur / npl.norm(speedCur))
        countAll = countAll + 1

    nL = newBirdIndexList

    for i in range(0, len(newBirdIndexList) - 1):
        allBirds.append(Bird(i, ts[nL[i]:nL[i+1]], coord[nL[i]:nL[i+1]],
                             speed[nL[i]:nL[i+1]], speedAbsolut[nL[i]:nL[i+1]],
                             speedNorm[nL[i]:nL[i+1]]))

    #    followerListsAllTimes = []
    bestTau = -1  # initalize bestTau with lowest possible value
    tMin = 0  # hardCoded for storch_data

    tauRange = l_f_param['tauRange']
    maxDist = l_f_param['maxDist']
    time1 = datetime.datetime.now()

    tInt = l_f_param['tStepIntervall']
    if tInt % 2 == 1:
        return "Error In Get_list TstepIntervall Must Be Even"

    followerListsAllTimes = [['time', 'iID', 'jID', 'tau',
                              'correlation']]
    # ['time', 'iID', 'jID', 'tau', 'correlation']
    res = l_f_param['timeResolution']
    tOffsMin = tMin + tInt + tauRange * 2
    tOffsMax = tMax - tInt - tauRange * 2
    for tOffs in range(tOffsMin, tOffsMax, res):
        for birdI in allBirds:
            for birdJ in allBirds:
                if birdI != birdJ:
                    sumTauList = []
                    for tau in range(-tauRange, tauRange + 1):  # instead of starting at 1
                        if tau == 0:
                            continue
                        sumB = 0
                        for t in range(tOffs - tInt, tOffs + 1 + tInt):
                            vDotProd = np.dot(birdI.speedNorm[t],
                                              birdJ.speedNorm[t + tau])
                            sumB = sumB + vDotProd
                        sumTauList.append(sumB)
                        tauMax = sumTauList.index(max(sumTauList)) - tauRange
                        if tauMax > -1:
                            tauMax = tauMax + 1  # Quatsch mogren machen ;)
                    bestTau = (tauMax, max(sumTauList) / (tInt * 2. + 1.) + 1)
                    if bestTau[1] > l_f_param['minSigni']+1:
                        distance = npl.norm(birdI.coord[t] - birdJ.coord[t])
                        if distance < maxDist:
                            if bestTau[0] > -1:
                                birdParam = [tOffs, birdI.iD, birdJ.iD,
                                             bestTau[0], bestTau[1]]
                            else:
                                birdParam = [tOffs, birdJ.iD, birdI.iD,
                                             -bestTau[0], bestTau[1]]
                            followerListsAllTimes.append(birdParam)
                        # print(lf_Dframe)

    time2 = datetime.datetime.now()
    deltaTime = time2 - time1

    print("Time used for Anlysis:")
    print(deltaTime)

    if len(followerListsAllTimes) < 2:
        print("EMPTY!EPMTY!EMPTY!-l_f_csv.py-")
    # with open('HALLOHALLO.csv', 'w', newline='') as csvfile:
    #    the_writer = csv.writer(csvfile)
    #    for i in range(0, len(followerListsAllTimes)):
    #        the_writer.writerow(followerListsAllTimes[i])

    return followerListsAllTimes
# lf_Dframe.to_csv("HALLOHALLO.csv", index=False)

# print(followerListsAllTimes)


# plt.plot(allBirds[0].speedAbsolut[5:250])
# plt.ylabel("Speed of the first bird")
# plt.show()
